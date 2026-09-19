"use client";

import { useEffect, useRef, useState } from "react";
import { useRaceStore, playerPalette } from "@/lib/store/race-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { PLAYER_COLOR_IDS, type PlayerColorId } from "@/lib/constants";
import { LOBBY_LIMITS } from "@/lib/race/types";
import { getAvailableCountrySets, getCountrySet, type CountrySetId } from "@/lib/geo/country-sets";
import { GUESSABLE_IDS } from "@/lib/geo/country-names";

/** How many countries a set can actually put in play. */
function setSize(id: CountrySetId): number {
  const ids = getCountrySet(id).countryIds;
  return ids ? ids.filter((c) => GUESSABLE_IDS.has(c)).length : GUESSABLE_IDS.size;
}

export default function LobbyView({ onLeave }: { onLeave: () => void }) {
  const lobby = useRaceStore((s) => s.lobby);
  const canStart = useRaceStore((s) => s.canStart);
  const playerId = useRaceStore((s) => s.playerId);
  const setReady = useRaceStore((s) => s.setReady);
  const setColor = useRaceStore((s) => s.setColor);
  const setPreferredColor = useSettingsStore((s) => s.setPlayerColor);
  const configure = useRaceStore((s) => s.configure);
  const start = useRaceStore((s) => s.start);
  const [copied, setCopied] = useState(false);
  const [picking, setPicking] = useState(false);
  const picker = useRef<HTMLSpanElement>(null);

  // A popover closes on the next click anywhere else, and on Escape — caught
  // in the capture phase so it does not also reach the handler that would
  // leave the room.
  useEffect(() => {
    if (!picking) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!picker.current?.contains(e.target as Node)) setPicking(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setPicking(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [picking]);

  if (!lobby) return null;

  const { roomId } = lobby;
  const isHost = lobby.hostId === playerId;
  const present = lobby.players.filter((p) => p.connected);
  const setId = lobby.config.countrySetId as CountrySetId;
  const continents = getAvailableCountrySets().filter((s) => s.id !== "all");
  // The count is capped by the set, so by default the whole set is in play.
  const setTotal = setSize(setId);
  const countInPlay = Math.min(lobby.config.countryCount, setTotal);
  const inPlay =
    countInPlay === setTotal ? `${setTotal} countries` : `${countInPlay} of ${setTotal}`;

  function pickSet(id: CountrySetId) {
    // Clicking the active continent goes back to the whole world, like solo.
    configure({ countrySetId: setId === id ? "all" : id });
  }

  /** Remembered for the next room too, not just this seat. */
  function pickColor(color: PlayerColorId) {
    setColor(color);
    setPreferredColor(color);
    setPicking(false);
  }

  function copyInvite() {
    navigator.clipboard.writeText(`${window.location.origin}/race?room=${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /** The one line under the roster saying what the room is still waiting on. */
  function waitingOn(): string {
    const missing = LOBBY_LIMITS.minPlayers - present.length;
    if (missing > 0) return `Waiting for ${missing} more`;
    if (!canStart) return "Waiting for everyone to ready up";
    return isHost ? "Everyone is ready" : "Waiting for the host";
  }

  return (
    <div className="panel panel-ticks panel-dialog">
      {/* The code and the way to share it are one target: the whole box is
          the copy button. Squared and hairline-bordered like the roster rows
          below it, since in dark every surface is the same black. */}
      <button
        onClick={copyInvite}
        aria-label="Copy the invite link"
        className="press mb-6 flex w-full cursor-pointer items-center justify-between gap-3 border border-hairline bg-well px-3 py-2.5 text-left transition-colors hover:border-hairline-strong md:px-4 md:py-3"
      >
        <span className="readout text-2xl tracking-[0.3em] text-hi md:text-3xl">{roomId}</span>
        <span
          className={`hud-label shrink-0 ${copied ? "text-signal" : "text-low"}`}
        >
          {copied ? "copied" : "copy invite"}
        </span>
      </button>

      <ul className="mb-6 flex flex-col gap-2">
        {lobby.players.map((p) => (
          <li key={p.id} className="flex items-center justify-between border border-hairline px-3 py-2">
            <span
              className={`flex min-w-0 items-center gap-1.5 ${
                p.connected ? "text-hi" : "text-faint line-through"
              }`}
            >
              {p.id === playerId ? (
                <span ref={picker} className="relative flex h-5 w-5 shrink-0">
                  <button
                    onClick={() => setPicking((open) => !open)}
                    aria-label="Your colour"
                    aria-expanded={picking}
                    className="press flex h-5 w-5 cursor-pointer items-center justify-center"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full ring-1 ring-hairline-strong"
                      style={{ backgroundColor: playerPalette(p.color).claim }}
                    />
                  </button>
                  {picking && (
                    /* Colours another seat holds stay in the row, dimmed, so
                       the room's mapping is readable from the picker too. */
                    <span className="absolute left-0 top-6 z-10 flex gap-1.5 border border-hairline bg-panel p-1.5">
                      {PLAYER_COLOR_IDS.map((color) => {
                        const owner = lobby.players.find((q) => q.color === color);
                        const taken = owner !== undefined && owner.id !== playerId;
                        return (
                          <button
                            key={color}
                            onClick={() => !taken && pickColor(color)}
                            // Not `disabled`: a disabled control takes the
                            // ancestor's cursor, so it could never show the
                            // pointer. The slash is what says it is spoken for.
                            aria-disabled={taken}
                            aria-label={color}
                            aria-pressed={color === p.color}
                            title={taken ? `${owner.name} has this one` : color}
                            className={`relative h-5 w-5 cursor-pointer border transition-all ${
                              color === p.color
                                ? "border-hi"
                                : taken
                                  ? "border-hairline opacity-50"
                                  : "press border-hairline hover:border-hairline-strong"
                            }`}
                            style={{ backgroundColor: playerPalette(color).claim }}
                          >
                            {taken && (
                              /* Struck through rather than hidden: the colour
                                 still has to say whose it is. */
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
              ) : (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: playerPalette(p.color).claim }}
                  />
                </span>
              )}
              {p.name}
              {p.id === lobby.hostId && <span className="hud-label ml-2 text-low">host</span>}
              {p.id === playerId && <span className="hud-label ml-2 text-low">you</span>}
            </span>
            {/* Your own status is the ready switch — toggled in line with
                your name rather than from a button further down. */}
            {p.id === playerId && p.connected ? (
              <button
                onClick={() => setReady(!p.ready)}
                aria-pressed={p.ready}
                className={`press hud-label cursor-pointer rounded-control border px-2 py-0.5 transition-colors ${
                  p.ready
                    ? "border-signal/60 bg-signal-soft text-signal"
                    : "border-hairline text-mid hover:border-hairline-strong hover:text-hi"
                }`}
              >
                {p.ready ? "ready" : "Ready up!"}
              </button>
            ) : (
              <span className={`hud-label ${p.ready ? "text-signal" : "text-faint"}`}>
                {p.connected ? (p.ready ? "ready" : "waiting") : "gone"}
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="mb-6">
        {/* Only the host picks the map; everyone else just reads the summary. */}
        {isHost && (
          <>
            <p className="hud-label mb-2 text-low">Map</p>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {continents.map((set) => {
                const selected = setId === set.id;
                return (
                  <button
                    key={set.id}
                    onClick={() => pickSet(set.id)}
                    className={`press cursor-pointer border px-3 py-2 text-left transition-all duration-200 ${
                      selected
                        ? "border-signal/60 bg-signal-soft text-signal"
                        : "border-hairline bg-well text-hi hover:border-signal/30 hover:bg-panel"
                    }`}
                  >
                    <span className="block text-sm">{set.name}</span>
                    <span className="readout text-label text-faint">
                      {setSize(set.id)} countries
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        <p className="hud-label text-low">
          {getCountrySet(setId).name} · <span className="readout">{inPlay}</span>
        </p>
      </div>

      {isHost && (
        <button
          onClick={start}
          disabled={!canStart}
          className="btn-signal press w-full cursor-pointer py-2 disabled:cursor-default disabled:opacity-40"
        >
          Start race
        </button>
      )}

      <p className="hud-label mt-4 text-center text-faint">{waitingOn()}</p>

      <button onClick={onLeave} className="btn-quiet press mt-4">
        Leave room
      </button>
    </div>
  );
}
