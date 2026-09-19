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
import type { CountrySetId } from "@/lib/geo/country-sets";
import { baseId } from "@/lib/geo/countries";
import { RACE_SERVER_URL } from "@/lib/race/config";
import { useRaceStore, raceFills } from "@/lib/store/race-store";
import MenuButton from "@/components/game/MenuButton";
import JoinView from "./JoinView";
import LobbyView from "./LobbyView";
import RaceHud from "./RaceHud";
import RaceMenu, { type RaceMenuView } from "./RaceMenu";
import RaceResults from "./RaceResults";

export interface RaceGlobeProps {
  resolvedCountries: Record<string, Resolution | CountryFill>;
  interactive: boolean;
  autoRotate: boolean;
  scene: GlobeScene;
  onCountryClick: (countryId: string) => void;
}

/**
 * Whether a lockout is still running, re-rendering exactly once when it ends.
 *
 * A deadline is not a value that changes on its own, so without this the
 * globe would stay frozen until the next broadcast happened to arrive.
 */
function useLockedOut(lockedUntil: number | null, clockOffset: number): boolean {
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
  const resolvedCountries = useMemo(
    () => raceFills(race, playerId, attemptIds, opacity),
    [race, playerId, attemptIds, opacity],
  );
  const onCountryClick = useCallback(
    (countryId: string) => guess(baseId(countryId)),
    [guess],
  );

  const racing = status === "racing" || status === "finished";

  // The globe is driven by the room, not the solo store: the lobby previews
  // the host's chosen set, the countdown flies to it, and results reframe.
  const scene = useMemo<GlobeScene>(() => {
    const countrySetId = (race?.config.countrySetId ??
      lobby?.config.countrySetId ??
      "all") as CountrySetId;
    const phase =
      status === "finished" ? "gameover" : status === "racing" ? "playing" : "idle";
    return { phase, countrySetId, gameKey: race?.startsAt ?? null };
  }, [race, lobby, status]);

  return {
    resolvedCountries,
    interactive: race?.phase === "racing" && !lockedOut,
    autoRotate: !racing,
    scene,
    onCountryClick,
  };
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

  const confirmExit = useCallback(() => {
    const quitting = menuView === "confirm-quit";
    setMenuView(null);
    if (quitting) exit();
    else leaveRoom();
  }, [menuView, exit, leaveRoom]);

  // Escape walks the ladder back one rung at a time: confirmation → race menu
  // → room → join form → main menu. Mid-race it opens the menu rather than
  // leaving, because a race cannot be paused and leaving one is a decision.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (status === "racing") {
        e.preventDefault();
        // Closed → menu → closed, and any deeper rung backs up to the menu.
        if (menuView === null) setMenuView("menu");
        else setMenuView(menuView === "menu" ? null : "menu");
      } else if (status === "finished") {
        e.preventDefault();
        exit();
      } else if (status === "lobby" || status === "connecting") {
        e.preventDefault();
        leaveRoom();
      } else if (status === "idle" || status === "error") {
        e.preventDefault();
        exit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status, menuView, leaveRoom, exit]);

  const racing = status === "racing" || status === "finished";

  return (
    <>
      {racing && <RaceHud />}
      {status === "racing" && menuView === null && (
        <MenuButton onClick={() => setMenuView("menu")} />
      )}
      {status === "racing" && menuView !== null && (
        <RaceMenu view={menuView} onView={setMenuView} onConfirmExit={confirmExit} />
      )}
      {status === "finished" && <RaceResults onBack={exit} />}

      {!racing && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
          {status === "lobby" ? (
            <LobbyView onLeave={leaveRoom} />
          ) : (
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
