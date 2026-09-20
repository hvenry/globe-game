"use client";

import { useEffect, useRef, useState } from "react";
import { useRaceStore, playerPalette } from "@/lib/store/race-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { useCopied } from "@/lib/hooks/useCopied";
import { play } from "@/lib/sound/engine";

import {
  CountrySetSelect,
  TimerLimitSelect,
  Toggle,
} from "@/components/game/settings/SettingsControls";
import { PLAYER_COLOR_IDS, type PlayerColorId } from "@/lib/constants";
import {
  LOBBY_LIMITS,
  RACE_WINDOW_SECONDS,
  type LobbyPlayer,
} from "@/lib/race/types";
import {
  getCountrySet,
  setSize,
  type CountrySetId,
} from "@/lib/geo/country-sets";
import { SlidersIcon, XIcon } from "@/components/ui/icons";
import PanelHeader from "@/components/ui/PanelHeader";
import ScrollColumn from "@/components/ui/ScrollColumn";
import ControlsSection from "@/components/game/settings/ControlsSection";
import PlayerDot from "./PlayerDot";
import Confirm from "./Confirm";

/** A seat count in the segmented chip: chosen, unreachable, or on offer. */
function seatChipTone(selected: boolean, blocked: boolean): string {
  if (selected) return "bg-signal-soft text-signal";
  if (blocked) return "text-faint";
  return "cursor-pointer text-mid hover:bg-panel hover:text-hi";
}

/** A swatch in the colour picker: yours, another seat's, or free. */
function swatchTone(mine: boolean, taken: boolean): string {
  if (mine) return "border-hi";
  if (taken) return "border-hairline opacity-50";
  return "press border-hairline hover:border-hairline-strong";
}

function readyLabel(player: LobbyPlayer): string {
  if (!player.connected) return "gone";
  return player.ready ? "ready" : "waiting";
}

/**
 * Your own dot doubles as the colour picker. Colours another seat holds stay
 * in the row, struck through rather than hidden — the picker also has to say
 * who already wears what.
 */
function ColorPicker({
  players,
  playerId,
  current,
  onPick,
}: {
  players: LobbyPlayer[];
  playerId: string | null;
  current: PlayerColorId;
  onPick: (color: PlayerColorId) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);

  // A popover closes on the next click anywhere else, and on Escape — caught
  // in the capture phase so it does not also reach the handler that would
  // leave the room.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      play("ui.click");
      setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  return (
    <span ref={root} className="relative flex h-5 w-5 shrink-0">
      <button
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-label="Your colour"
        aria-expanded={open}
        className="press flex h-5 w-5 cursor-pointer items-center justify-center"
      >
        <PlayerDot
          color={current}
          className="h-2.5 w-2.5 ring-1 ring-hairline-strong"
        />
      </button>
      {open && (
        <span className="absolute left-0 top-6 z-10 flex gap-1.5 border border-hairline bg-panel p-1.5">
          {PLAYER_COLOR_IDS.map((color) => {
            const owner = players.find((q) => q.color === color);
            const taken = owner !== undefined && owner.id !== playerId;
            return (
              <button
                key={color}
                onClick={() => {
                  if (taken) return;
                  onPick(color);
                  setOpen(false);
                }}
                // Not `disabled`: a disabled control takes the ancestor's
                // cursor, so it could never show the pointer. The slash is
                // what says it is spoken for.
                aria-disabled={taken}
                aria-label={color}
                aria-pressed={color === current}
                title={taken ? `${owner.name} has this one` : color}
                className={`relative h-5 w-5 cursor-pointer border transition-all ${swatchTone(
                  color === current,
                  taken,
                )}`}
                style={{ backgroundColor: playerPalette(color).claim }}
              >
                {taken && (
                  <span
                    aria-hidden
                    className="absolute inset-0 text-hi"
                    style={{
                      background:
                        "linear-gradient(to top left, transparent calc(50% - 1px), currentColor calc(50% - 1px), currentColor calc(50% + 1px), transparent calc(50% + 1px))",
                    }}
                  />
                )}
              </button>
            );
          })}
        </span>
      )}
    </span>
  );
}

export default function LobbyView({ onLeave }: { onLeave: () => void }) {
  const lobby = useRaceStore((s) => s.lobby);
  const canStart = useRaceStore((s) => s.canStart);
  const playerId = useRaceStore((s) => s.playerId);
  const setReady = useRaceStore((s) => s.setReady);
  const setColor = useRaceStore((s) => s.setColor);
  const setPreferredColor = useSettingsStore((s) => s.setPlayerColor);
  const configure = useRaceStore((s) => s.configure);
  const kick = useRaceStore((s) => s.kick);
  const start = useRaceStore((s) => s.start);
  const { copied, copy } = useCopied();
  // The map picker is its own view, like the solo menu's game options, so the
  // lobby itself stays short: a summary tile here, the choices one step in.
  const [view, setView] = useState<
    "lobby" | "options" | "controls" | "confirm-leave" | "countrySet"
  >("lobby");

  // Escape steps one rung back: out of a sub-view to the room, and from the
  // room to the leave question rather than straight out. On the document
  // rather than the window so the colour picker's own Escape, which stops
  // at the window, wins while it is open; and capture, so the room-level
  // handler that would leave never sees it.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      play("ui.click");
      setView(
        view === "lobby"
          ? "confirm-leave"
          : view === "countrySet"
            ? "options"
            : "lobby",
      );
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [view]);

  if (!lobby) return null;

  const { roomId } = lobby;
  const isHost = lobby.hostId === playerId;
  const present = lobby.players.filter((p) => p.connected);
  // Seats the host has opened but nobody has taken yet, drawn as empty rows
  // so the room's size is visible without reading a number.
  const openSeats = Math.max(0, lobby.maxPlayers - lobby.players.length);
  const seatOptions = Array.from(
    { length: LOBBY_LIMITS.maxPlayers - LOBBY_LIMITS.minPlayers + 1 },
    (_, i) => LOBBY_LIMITS.minPlayers + i,
  );
  const setId = lobby.config.countrySetId as CountrySetId;
  // The count is capped by the set, so by default the whole set is in play.
  const setTotal = setSize(setId);
  const countInPlay = Math.min(lobby.config.countryCount, setTotal);
  const inPlay =
    countInPlay === setTotal
      ? `${setTotal} countries`
      : `${countInPlay} of ${setTotal}`;

  /** Remembered for the next room too, not just this seat. */
  function pickColor(color: PlayerColorId) {
    setColor(color);
    setPreferredColor(color);
  }

  function copyInvite() {
    copy(`${window.location.origin}/race?room=${roomId}`);
  }

  /** The one line under the roster saying what the room is still waiting on. */
  function waitingOn(): string {
    const missing = LOBBY_LIMITS.minPlayers - present.length;
    if (missing > 0) return `Waiting for ${missing} more`;
    if (!canStart) return "Waiting for everyone to ready up";
    return isHost ? "Everyone is ready" : "Waiting for the host";
  }

  if (view === "confirm-leave") {
    return (
      <div className="panel panel-ticks panel-dialog">
        <p className="hud-label text-center text-mid">Room {roomId}</p>
        <Confirm
          question="Leave the room?"
          consequence="Your seat is freed; the code gets you back in while the room lasts."
          cancelLabel="Stay"
          confirmLabel="Yes, leave the room"
          onCancel={() => setView("lobby")}
          onConfirm={onLeave}
        />
      </div>
    );
  }

  if (view === "countrySet") {
    return (
      <div className="panel panel-ticks panel-dialog max-w-[22rem] md:max-w-2xl">
        <ScrollColumn
          header={
            <PanelHeader
              title="Country set"
              onBack={() => setView("options")}
            />
          }
          footer={
            !isHost ? (
              <p className="border-t border-hairline pt-3 text-center text-label text-faint">
                Only the host can change this
              </p>
            ) : undefined
          }
        >
          <div className={isHost ? "" : "pointer-events-none opacity-40"}>
            <CountrySetSelect
              value={setId}
              onChange={(id) => configure({ countrySetId: id })}
              expertMode={false}
              columns={3}
            />
          </div>
        </ScrollColumn>
      </div>
    );
  }

  if (view === "controls") {
    return (
      <div className="panel panel-ticks panel-dialog text-left">
        <PanelHeader title="Controls" onBack={() => setView("lobby")} />
        <div className="mt-6">
          <ControlsSection expertMode={false} />
        </div>
      </div>
    );
  }

  if (view === "options") {
    return (
      // Same width and scroll frame as the solo settings panel, so the same
      // controls sit the same way here.
      <div className="panel panel-ticks panel-dialog max-w-[20rem] md:max-w-md">
        <ScrollColumn
          header={
            <PanelHeader title="Game options" onBack={() => setView("lobby")} />
          }
          footer={
            !isHost ? (
              <p className="border-t border-hairline pt-3 text-center text-label text-faint">
                Only the host can change these
              </p>
            ) : undefined
          }
        >
          {/* The solo settings panel's own controls, cut down to what a race
              uses. The host edits; for everyone else the controls are inert
              but drawn the same, so the room's settings read identically on
              every screen. */}
          <div
            className={`space-y-8 ${isHost ? "" : "pointer-events-none opacity-40"}`}
          >
            {/* The picker has its own, wider panel; this is the way in. */}
            <div className="space-y-3">
              <p className="hud-rule hud-label">Country set</p>
              <button
                onClick={() => setView("countrySet")}
                className="group w-full cursor-pointer rounded-control border border-hairline bg-well px-3 py-2 text-left transition-colors hover:border-hairline-strong hover:bg-panel"
              >
                <p className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-hi group-hover:underline underline-offset-2">
                    {getCountrySet(setId).name}
                  </span>
                  <span className="readout text-label text-faint">
                    {inPlay}
                  </span>
                </p>
              </button>
            </div>

            <TimerLimitSelect
              value={lobby.config.countryWindowMs / 1000}
              onChange={(sec) =>
                sec !== null && configure({ countryWindowSec: sec })
              }
              limits={RACE_WINDOW_SECONDS}
            />

            <div className="space-y-3">
              <p className="hud-rule hud-label">Rules</p>
              <div className="space-y-2">
                <Toggle
                  enabled={lobby.config.showHints}
                  onChange={(show) => configure({ showHints: show })}
                  label="Show Hints"
                  description="Display country names on incorrect guesses"
                />
              </div>
            </div>
          </div>
        </ScrollColumn>
      </div>
    );
  }

  return (
    <div className="panel panel-ticks panel-dialog">
      {/* Camera, theme and sound: the same corner button the race menu has. */}
      <button
        onClick={() => setView("controls")}
        aria-label="Controls"
        className="btn-icon press absolute right-3 top-3 md:right-4 md:top-4"
      >
        <SlidersIcon size={13} />
      </button>

      {/* The code and the way to share it are one target: the whole box is
          the copy button. Squared and hairline-bordered like the roster rows
          below it, since in dark every surface is the same black. */}
      <button
        onClick={copyInvite}
        aria-label="Copy the invite link"
        className="press mb-6 flex w-full cursor-pointer items-center justify-between gap-3 border border-hairline bg-well px-3 py-2.5 text-left transition-colors hover:border-hairline-strong md:px-4 md:py-3"
      >
        <span className="readout text-2xl tracking-[0.3em] text-hi md:text-3xl">
          {roomId}
        </span>
        <span
          className={`hud-label shrink-0 ${copied ? "text-signal" : "text-low"}`}
        >
          {copied ? "copied" : "copy invite"}
        </span>
      </button>

      <div className="mb-2 flex items-center justify-between">
        <p className="hud-label text-low">
          Players ·{" "}
          <span className="readout">
            {present.length}/{lobby.maxPlayers}
          </span>
        </p>
        {/* Seat count as one small segmented chip, host only: the room's
            size is a detail beside the roster, not a setting of its own. */}
        {isHost && (
          <div
            role="group"
            aria-label="Seats"
            className="flex overflow-hidden rounded-control border border-hairline"
          >
            {seatOptions.map((n) => {
              const selected = lobby.maxPlayers === n;
              // The room never shrinks below who is already in it.
              const blocked = n < present.length;
              return (
                <button
                  key={n}
                  onClick={() => !blocked && configure({ maxPlayers: n })}
                  aria-pressed={selected}
                  aria-disabled={blocked}
                  className={`readout h-6 w-7 text-xs transition-colors ${seatChipTone(
                    selected,
                    blocked,
                  )}`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ul className="mb-6 flex flex-col gap-2">
        {lobby.players.map((p) => (
          <li key={p.id}>
            <div className="flex items-center justify-between border border-hairline px-3 py-2">
              <span
                className={`flex min-w-0 items-center gap-1.5 ${
                  p.connected ? "text-hi" : "text-faint line-through"
                }`}
              >
                {p.id === playerId ? (
                  <ColorPicker
                    players={lobby.players}
                    playerId={playerId}
                    current={p.color}
                    onPick={pickColor}
                  />
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <PlayerDot color={p.color} className="h-2.5 w-2.5" />
                  </span>
                )}
                {p.name}
                {p.id === lobby.hostId && (
                  <span className="hud-label ml-2 text-low">host</span>
                )}
                {p.id === playerId && (
                  <span className="hud-label ml-2 text-low">you</span>
                )}
              </span>
              {/* Your own status is the ready switch — toggled in line with
                your name rather than from a button further down. */}
              {p.id === playerId && p.connected ? (
                <button
                  onClick={() => setReady(!p.ready)}
                  aria-pressed={p.ready}
                  data-sound="toggle"
                  className={`press hud-label cursor-pointer rounded-control border px-2 py-0.5 transition-colors ${
                    p.ready
                      ? "border-signal/60 bg-signal-soft text-signal"
                      : "border-hairline text-mid hover:border-hairline-strong hover:text-hi"
                  }`}
                >
                  {p.ready ? "ready" : "Ready up!"}
                </button>
              ) : (
                <span className="flex items-center gap-2">
                  <span
                    className={`hud-label ${p.ready ? "text-signal" : "text-faint"}`}
                  >
                    {readyLabel(p)}
                  </span>
                  {isHost && (
                    <button
                      onClick={() => kick(p.id)}
                      aria-label={`Remove ${p.name}`}
                      title="Remove from room"
                      className="press flex h-5 w-5 cursor-pointer items-center justify-center text-faint transition-colors hover:text-alert"
                    >
                      <XIcon size={12} />
                    </button>
                  )}
                </span>
              )}
            </div>
          </li>
        ))}
        {Array.from({ length: openSeats }, (_, i) => (
          <li
            key={`open-${i}`}
            className="flex items-center border border-dashed border-hairline px-3 py-2"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full border border-hairline"
              />
            </span>
            <span className="hud-label ml-1.5 text-faint">Open seat</span>
          </li>
        ))}
      </ul>

      {/* One tile for the room's options: the map on show, hints and the
          picker one step in. Everyone can open it; only the host can change
          the map inside. */}
      <button
        onClick={() => setView("options")}
        className="group mb-6 w-full cursor-pointer rounded-control border border-hairline bg-well px-3 py-2 text-left transition-colors hover:bg-panel md:px-3 md:py-2.5"
      >
        <p className="hud-label mb-1">Game options</p>
        <p className="flex items-center justify-between gap-2 text-xs font-medium md:text-sm">
          <span className="truncate text-mid underline-offset-2 group-hover:text-hi group-hover:underline">
            {getCountrySet(setId).name}
          </span>
          <span className="readout shrink-0 text-label text-faint">
            {inPlay}
          </span>
        </p>
      </button>

      {isHost && (
        <button
          onClick={start}
          disabled={!canStart}
          className={`btn-primary press transition-all duration-200 ${
            canStart
              ? "btn-signal cursor-pointer"
              : "cursor-default border border-hairline bg-transparent text-faint"
          }`}
        >
          Start race
        </button>
      )}

      <p className="hud-label mt-4 text-center text-faint">{waitingOn()}</p>

      <button
        onClick={() => setView("confirm-leave")}
        className="btn-quiet press mt-4"
      >
        Leave room
      </button>
    </div>
  );
}
