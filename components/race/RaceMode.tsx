"use client";

/**
 * Race mode as seen by the shared globe.
 *
 * Race does not own a canvas: `GameContainer` renders one globe for every
 * mode, and swaps in these props when the player is racing. That is what
 * makes entering a race from the menu seamless — the scene, textures and
 * camera all persist. `useRaceGlobe` supplies the globe props; `RaceOverlay`
 * is the DOM layered on top.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GlobeScene } from "@/components/globe/Globe";
import type { Resolution } from "@/lib/engine/types";
import type { CountryFill } from "@/lib/constants";
import { useSceneColors } from "@/lib/hooks/useSceneColors";
import {
  getCountrySet,
  isCountrySetId,
  fixedCountOf,
} from "@/lib/geo/country-sets";
import { baseId } from "@/lib/geo/countries";
import { RACE_SERVER_URL } from "@/lib/race/config";
import {
  useRaceStore,
  raceFills,
  type RaceStatus,
} from "@/lib/store/race-store";
import { play } from "@/lib/sound/engine";
import MenuButton from "@/components/game/MenuButton";
import JoinView from "./JoinView";
import LobbyView from "./LobbyView";
import RaceHud from "./RaceHud";
import ClickFeedback from "@/components/game/ClickFeedback";
import { useGameStore } from "@/lib/store/game-store";
import { COUNTRY_NAMES } from "@/lib/geo/country-names";
import RaceMenu, { type RaceMenuView } from "./RaceMenu";
import RaceResults from "./RaceResults";

export interface RaceGlobeProps {
  resolvedCountries: Record<string, Resolution | CountryFill>;
  hoverFilled: boolean;
  interactive: boolean;
  autoRotate: boolean;
  scene: GlobeScene;
  onCountryClick: (
    countryId: string,
    position: [number, number, number],
  ) => void;
}

/**
 * Whether a lockout is still running, re-rendering exactly once when it ends.
 *
 * A deadline is not a value that changes on its own, so without this the
 * globe would stay frozen until the next broadcast happened to arrive.
 */
function useLockedOut(
  lockedUntil: number | null,
  clockOffset: number,
): boolean {
  // The clock is read in the effect and parked in state: render stays pure,
  // and a stale `now` can only err on the side of still-locked, which the
  // timer then corrects.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (lockedUntil === null) return;
    const remaining = lockedUntil - (Date.now() + clockOffset);
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [lockedUntil, clockOffset]);

  return lockedUntil !== null && lockedUntil > now + clockOffset;
}

/**
 * `value`, but keeping the previous reference while `key` is unchanged.
 *
 * Every broadcast is freshly parsed JSON, so nothing derived from it is ever
 * reference-equal to the last one. The globe repaints a 4096×2048 texture
 * whenever its fills change identity, so the fills keep theirs until what they
 * paint actually differs. Held with the "adjust state on prop change" pattern,
 * like `useBursts` in RaceHud, so render stays pure.
 */
function useStableByKey<T>(value: T, key: string): T {
  const [held, setHeld] = useState({ key, value });
  if (held.key !== key) {
    setHeld({ key, value });
    return value;
  }
  return held.value;
}

/** The room's status as a globe phase: the camera flies and reframes on it. */
function scenePhase(status: RaceStatus): GlobeScene["phase"] {
  if (status === "finished") return "gameover";
  if (status === "racing") return "playing";
  return "idle";
}

export function useRaceGlobe(): RaceGlobeProps {
  const status = useRaceStore((s) => s.status);
  const race = useRaceStore((s) => s.race);
  const lobby = useRaceStore((s) => s.lobby);
  const playerId = useRaceStore((s) => s.playerId);
  const guess = useRaceStore((s) => s.guess);
  const attemptIds = useRaceStore((s) => s.attemptIds);
  const clockOffset = useRaceStore((s) => s.clockOffset);

  // A lockout takes the globe with it: no hover highlight and no clicks until
  // it expires, so a locked player cannot keep scanning the map for free.
  const lockedOut = useLockedOut(
    race?.players.find((p) => p.id === playerId)?.lockedUntil ?? null,
    clockOffset,
  );

  // Claims and misses take the theme's own fill weights, so a race reads at
  // the same strength as a solo game on either globe.
  const COLORS = useSceneColors();
  const opacity = useMemo(
    () => ({
      claim: COLORS.fillOpacity.perfect,
      attempt: COLORS.fillOpacity.wrongGuess,
    }),
    [COLORS],
  );
  const fills = useMemo(
    () => raceFills(race, playerId, attemptIds, opacity),
    [race, playerId, attemptIds, opacity],
  );
  // A new country, a lockout or a clock correction changes `race` but not a
  // single fill; only a claim, an expiry or a miss should repaint.
  const resolvedCountries = useStableByKey(fills, JSON.stringify(fills));
  // With hints on, a painted country answers a click with its name instead
  // of a guess — it can never be the target, and the lockout would only
  // punish curiosity.
  const showHints = race?.config.showHints ?? lobby?.config.showHints ?? false;
  const addFloatingLabel = useGameStore((s) => s.addFloatingLabel);
  const onCountryClick = useCallback(
    (countryId: string, position: [number, number, number]) => {
      const base = baseId(countryId);
      if (showHints && resolvedCountries[base] !== undefined) {
        addFloatingLabel(COUNTRY_NAMES[base] ?? base, position);
        return;
      }
      guess(base);
    },
    [guess, showHints, resolvedCountries, addFloatingLabel],
  );

  const racing = status === "racing" || status === "finished";

  // The globe is driven by the room, not the solo store: the lobby previews
  // the host's chosen set, the countdown flies to it, and results reframe.
  //
  // Built from primitives rather than `race` itself, which is a new object on
  // every broadcast: a new scene means a new playable set, and a new set
  // repaints the land layer.
  // The set id comes off the wire as a plain string, so it is checked here
  // rather than asserted.
  const configured = race?.config.countrySetId ?? lobby?.config.countrySetId;
  const countrySetId =
    configured && isCountrySetId(configured) ? configured : "all";
  // A draw or ranked set's sample is only knowable from the race itself.
  const drawIds =
    race && fixedCountOf(getCountrySet(countrySetId)) !== null
      ? race.inPlay.join(",")
      : null;
  const validIds = useMemo(
    () => (drawIds ? new Set(drawIds.split(",")) : null),
    [drawIds],
  );
  const phase = scenePhase(status);
  const gameKey = race?.startsAt ?? null;
  // A country nobody found is lit until someone finds it.
  const pulseId = race?.phase === "reveal" ? race.currentId : null;
  const scene = useMemo<GlobeScene>(
    () => ({ phase, countrySetId, validIds, gameKey, pulseId }),
    [phase, countrySetId, validIds, gameKey, pulseId],
  );

  return {
    resolvedCountries,
    hoverFilled: showHints,
    // Only while connected: after leaving, the race is on screen but not ours.
    interactive:
      status === "racing" &&
      (race?.phase === "racing" || race?.phase === "reveal") &&
      !lockedOut,
    autoRotate: !racing,
    scene,
    onCountryClick,
  };
}

const EMPTY_PLAYERS: readonly {
  id: string;
  name: string;
  connected: boolean;
}[] = [];

function seatStatus(player: { connected: boolean }, mine: boolean): string {
  if (mine) return "away";
  return player.connected ? "racing" : "gone";
}

/**
 * Stepped out of a running race. The seat and the score are held, so this is
 * the room with a way back in rather than a dead end.
 */
function LeftRaceView({
  onRejoin,
  onLeaveRoom,
}: {
  onRejoin: () => void;
  onLeaveRoom: () => void;
}) {
  const roomId = useRaceStore((s) => s.roomId);
  const playerId = useRaceStore((s) => s.playerId);
  // Selected as stored references: a selector that builds a fresh `[]` reads
  // as a new value every render and loops the store subscription.
  const racePlayers = useRaceStore((s) => s.race?.players);
  const lobbyPlayers = useRaceStore((s) => s.lobby?.players);
  const players = racePlayers ?? lobbyPlayers ?? EMPTY_PLAYERS;

  return (
    <div className="panel panel-ticks panel-dialog">
      <p className="hud-label mb-1 text-mid">Room</p>
      <p className="readout mb-6 text-2xl tracking-[0.3em] text-hi md:text-3xl">
        {roomId}
      </p>
      <p className="mb-6 text-sm text-mid">
        You left the race. Your seat and your score are kept while it runs.
      </p>
      <ul className="mb-6 flex flex-col gap-2">
        {players.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between border border-hairline px-3 py-2"
          >
            <span className={p.id === playerId ? "text-hi" : "text-mid"}>
              {p.name}
              {p.id === playerId && (
                <span className="hud-label ml-2 text-low">you</span>
              )}
            </span>
            <span className="hud-label text-faint">
              {seatStatus(p, p.id === playerId)}
            </span>
          </li>
        ))}
      </ul>
      <button onClick={onRejoin} className="btn-primary btn-signal press">
        Rejoin race
      </button>
      <button onClick={onLeaveRoom} className="btn-quiet press mt-3">
        Leave room
      </button>
    </div>
  );
}

export function RaceOverlay({
  initialRoom,
  onExit,
}: {
  initialRoom: string;
  /** Back to the main menu. The room is left first. */
  onExit: () => void;
}) {
  const status = useRaceStore((s) => s.status);
  const connection = useRaceStore((s) => s.connection);
  const error = useRaceStore((s) => s.error);
  const attempts = useRaceStore((s) => s.attempts);
  const leave = useRaceStore((s) => s.leave);

  /** Which rung of the mid-race menu is showing; null while it is closed. */
  const [menuView, setMenuView] = useState<RaceMenuView | null>(null);

  // Drop the socket when the mode unmounts rather than leaving the room to
  // time out; the server marks the player gone as soon as it closes.
  useEffect(() => () => leave(), [leave]);

  // Leaving a room drops back to the join form, one rung at a time. The code
  // leaves the URL with it, so a refresh lands on the form and not the room.
  const leaveRoom = useCallback(() => {
    leave();
    window.history.replaceState(null, "", "/race");
  }, [leave]);

  const exit = useCallback(() => {
    leave();
    onExit();
  }, [leave, onExit]);

  const leaveRace = useRaceStore((s) => s.leaveRace);
  const rejoin = useRaceStore((s) => s.rejoin);
  const rematch = useRaceStore((s) => s.rematch);

  const confirmExit = useCallback(() => {
    const quitting = menuView === "confirm-quit";
    setMenuView(null);
    // Leaving the race keeps the room on screen; the seat waits for a rejoin.
    if (quitting) exit();
    else leaveRace();
  }, [menuView, exit, leaveRace]);

  // Escape walks the ladder back one rung at a time: confirmation → race menu
  // → room → join form → main menu. Mid-race it opens the menu rather than
  // leaving, because a race cannot be paused and leaving one is a decision.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      if (status === "racing") {
        e.preventDefault();
        // Closed → menu → closed, and any deeper rung backs up to the menu.
        play(menuView === null ? "ui.open" : "ui.click");
        setMenuView(menuView === "menu" ? null : "menu");
        return;
      }

      // Everywhere else Escape steps back a rung, and they all sound alike.
      let back: (() => void) | null = null;
      switch (status) {
        case "finished":
          // One rung back is the waiting room, ready for another round.
          back = rematch;
          break;
        case "lobby":
        case "connecting":
        case "left":
          back = leaveRoom;
          break;
        case "idle":
        case "error":
          back = exit;
          break;
      }
      if (!back) return;
      e.preventDefault();
      play("ui.click");
      back();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status, menuView, leaveRoom, exit, rematch]);

  const racing = status === "racing" || status === "finished";

  return (
    <>
      {racing && <RaceHud />}
      {status === "racing" && <ClickFeedback />}
      {status === "racing" && menuView === null && (
        <MenuButton onClick={() => setMenuView("menu")} />
      )}
      {status === "racing" && menuView !== null && (
        <RaceMenu
          view={menuView}
          onView={setMenuView}
          onConfirmExit={confirmExit}
        />
      )}
      {status === "finished" && <RaceResults onLobby={rematch} onBack={exit} />}

      {!racing && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
          {status === "lobby" && <LobbyView onLeave={leaveRoom} />}
          {status === "left" && (
            <LeftRaceView onRejoin={rejoin} onLeaveRoom={leaveRoom} />
          )}
          {status !== "lobby" && status !== "left" && (
            <JoinView initialRoom={initialRoom} onBack={exit} />
          )}
        </div>
      )}

      {status !== "idle" && connection !== "open" && (
        <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 text-center">
          <p className="hud-pill text-label text-faint">
            {connection === "connecting" ? "Connecting…" : "Reconnecting…"}
          </p>
          {/* Two failures in a row is no longer a blip worth staying quiet about. */}
          {attempts >= 2 && (
            <p className="mt-2 max-w-xs text-sm text-alert">
              Can&apos;t reach the race server at {RACE_SERVER_URL}. Is{" "}
              <span className="readout">pnpm race:dev</span> running?
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="hud-pill absolute bottom-12 left-1/2 z-20 -translate-x-1/2 text-label text-alert">
          {error}
        </p>
      )}
    </>
  );
}
