"use client";

import { useEffect, useState } from "react";
import { standings as rank } from "@/lib/engine/race";
import { useRaceStore, usePlayerInk } from "@/lib/store/race-store";
import { COUNTRY_NAMES } from "@/lib/geo/country-names";
import type { RacePlayer, RaceResult } from "@/lib/engine/types";
import ScoreRoller from "./ScoreRoller";
import RaceFeed from "./RaceFeed";
import PlayerDot from "./PlayerDot";

/** Fast enough that the window bar reads as sliding, not stepping. */
const TICK_MS = 100;
/** How long a "+N" stays. Matches `.animate-fade-in-out-up`'s own run. */
const BURST_TTL_MS = 2_000;

/** Ticks locally between broadcasts so the timer bar is smooth, not steppy. */
function useTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/**
 * A "+N" that pops beside your score and drifts away. The delta is derived
 * while rendering (the "adjust state on prop change" pattern) rather than in
 * an effect, so it costs no extra render; only the expiry runs on a timer.
 */
function useBursts(score: number | undefined): { id: number; delta: number }[] {
  const [bursts, setBursts] = useState<{ id: number; delta: number }[]>([]);
  const [seen, setSeen] = useState(score);
  if (score !== seen) {
    setSeen(score);
    if (score !== undefined && seen !== undefined && score > seen) {
      setBursts((b) => [
        ...b,
        { id: Date.now() + Math.random(), delta: score - seen },
      ]);
    }
  }
  useEffect(() => {
    if (bursts.length === 0) return;
    const t = setTimeout(() => setBursts((b) => b.slice(1)), BURST_TTL_MS);
    return () => clearTimeout(t);
  }, [bursts]);
  return bursts;
}

/** Who took the country that just settled, in the second person where it is you. */
function claimLine(
  result: RaceResult,
  playerId: string | null,
  claimant: RacePlayer | undefined,
): string {
  const verb = result.recovered ? "recovered" : "claimed";
  if (result.by === null) return "Nobody got it";
  if (result.by === playerId) return `You ${verb} it`;
  return `${claimant?.name} ${verb} it`;
}

export default function RaceHud() {
  const race = useRaceStore((s) => s.race);
  const playerId = useRaceStore((s) => s.playerId);
  const offset = useRaceStore((s) => s.clockOffset);
  const ink = usePlayerInk();
  const now = useTick(race?.phase === "racing" || race?.phase === "countdown");
  const me = race?.players.find((p) => p.id === playerId);
  const bursts = useBursts(me?.score);

  if (!race) return null;
  const serverNow = now + offset;

  const remaining =
    race.phaseDeadline === null
      ? 0
      : Math.max(0, race.phaseDeadline - serverNow);
  const lockedFor = me?.lockedUntil
    ? Math.max(0, me.lockedUntil - serverNow)
    : 0;
  const result = race.currentId ? race.results[race.currentId] : undefined;
  const claimant = result?.by
    ? race.players.find((p) => p.id === result.by)
    : undefined;

  if (race.phase === "countdown") {
    return (
      <div className="hud-top pointer-events-none absolute inset-x-0 z-10 flex justify-center">
        <div className="hud-card">
          <p className="readout text-4xl text-hi">
            {Math.ceil(remaining / 1000)}
          </p>
        </div>
      </div>
    );
  }

  const windowFraction =
    race.phase === "racing" ? remaining / race.config.countryWindowMs : 0;
  const revealing = race.phase === "reveal";
  const order = rank(race).map((p) => p.id);

  return (
    <>
      <div className="hud-top pointer-events-none absolute inset-x-0 z-10 flex flex-col items-center gap-1.5">
        <div className="hud-card hud-card-row flex-col items-center">
          <p className={revealing ? "text-alert" : "text-hi"}>
            {race.currentId
              ? (COUNTRY_NAMES[race.currentId] ?? "Unknown")
              : "—"}
          </p>
        </div>
        <p className="hud-pill readout text-faint">
          {race.currentIndex + 1}/{race.total}
        </p>
        {revealing ? (
          /* No bar: the reveal has no clock. The country is lit on the globe
             and stays until someone finds it. */
          <p className="hud-pill mt-1 text-label text-alert">
            Nobody got it — find it for +bonus
          </p>
        ) : (
          <div className="progress-track mt-1 h-0.5 w-40">
            <div
              className="h-full bg-signal transition-none"
              style={{
                width: `${Math.max(0, Math.min(1, windowFraction)) * 100}%`,
              }}
            />
          </div>
        )}
        {result !== undefined && (
          <p className="hud-pill mt-1 text-label text-hi">
            {claimLine(result, playerId, claimant)}
          </p>
        )}
        {lockedFor > 0 && (
          <p className="hud-pill mt-1 text-label text-alert">
            Locked {(lockedFor / 1000).toFixed(1)}s
          </p>
        )}
      </div>

      <div className="hud-top absolute right-4 z-10 flex flex-col items-end gap-2 md:right-6">
        {/* Rows stay in join order in the DOM and are translated to their
            rank, so a change in the standings slides cards past each other
            instead of re-rendering the list. Every card is one row high, so
            a 100% offset is exactly one row. */}
        <div className="flex flex-col items-end gap-1">
          {race.players.map((p, j) => {
            const mine = p.id === playerId;
            const i = order.indexOf(p.id);
            return (
              <div
                key={p.id}
                className="hud-card hud-card-row relative gap-3 transition-transform duration-500 ease-in-out"
                style={{
                  transform: `translateY(calc(${i - j} * (100% + 0.25rem)))`,
                  zIndex: race.players.length - i,
                }}
              >
                <span
                  className={`flex items-center gap-2 ${mine ? "text-hi" : "text-mid"}`}
                >
                  <PlayerDot color={p.color} />
                  {p.name}
                  {p.streak >= 2 && (
                    <span
                      className="readout text-label"
                      style={{ color: ink(p.color) }}
                    >
                      ×{p.streak}
                    </span>
                  )}
                  {!p.connected && (
                    <span className="hud-label ml-1 text-faint">gone</span>
                  )}
                </span>
                <ScoreRoller value={p.score} className="text-signal" />
                {mine &&
                  bursts.map((b) => (
                    <span
                      key={b.id}
                      className="animate-fade-in-out-up readout pointer-events-none absolute -left-2 top-1/2 -translate-x-full -translate-y-1/2 text-sm"
                      style={{ color: ink(p.color) }}
                    >
                      +{b.delta}
                    </span>
                  ))}
              </div>
            );
          })}
        </div>
        <RaceFeed race={race} playerId={playerId} />
      </div>
    </>
  );
}
