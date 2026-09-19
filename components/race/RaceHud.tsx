"use client";

import { useEffect, useState } from "react";
import { useRaceStore, playerPalette } from "@/lib/store/race-store";
import { COUNTRY_NAMES } from "@/lib/geo/country-names";

/** Ticks locally between broadcasts so the timer bar is smooth, not steppy. */
function useTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

export default function RaceHud() {
  const race = useRaceStore((s) => s.race);
  const playerId = useRaceStore((s) => s.playerId);
  const offset = useRaceStore((s) => s.clockOffset);
  const now = useTick(race?.phase === "racing" || race?.phase === "countdown");

  if (!race) return null;
  const serverNow = now + offset;

  const remaining = race.phaseDeadline === null ? 0 : Math.max(0, race.phaseDeadline - serverNow);
  const me = race.players.find((p) => p.id === playerId);
  const lockedFor = me?.lockedUntil ? Math.max(0, me.lockedUntil - serverNow) : 0;
  const claimedBy = race.currentId ? race.results[race.currentId]?.by : undefined;

  if (race.phase === "countdown") {
    return (
      <div className="hud-top pointer-events-none absolute inset-x-0 z-10 flex justify-center">
        <div className="hud-card">
          <p className="readout text-4xl text-hi">{Math.ceil(remaining / 1000)}</p>
        </div>
      </div>
    );
  }

  const windowFraction =
    race.phase === "racing" ? remaining / race.config.countryWindowMs : 0;

  return (
    <>
      <div className="hud-top pointer-events-none absolute inset-x-0 z-10 flex flex-col items-center gap-1.5">
        <div className="hud-card hud-card-row flex-col items-center">
          <p className="text-hi">
            {race.currentId ? COUNTRY_NAMES[race.currentId] ?? "Unknown" : "—"}
          </p>
        </div>
        <p className="hud-pill readout text-faint">
          {race.currentIndex + 1}/{race.order.length}
        </p>
        <div className="progress-track mt-1 h-0.5 w-40">
          <div
            className="h-full bg-signal transition-none"
            style={{ width: `${Math.max(0, Math.min(1, windowFraction)) * 100}%` }}
          />
        </div>
        {claimedBy !== undefined && (
          <p className="hud-pill mt-1 text-label text-hi">
            {claimedBy === null
              ? "Nobody got it"
              : claimedBy === playerId
                ? "You claimed it"
                : `${race.players.find((p) => p.id === claimedBy)?.name} claimed it`}
          </p>
        )}
        {lockedFor > 0 && (
          <p className="hud-pill mt-1 text-label text-alert">
            Locked {(lockedFor / 1000).toFixed(1)}s
          </p>
        )}
      </div>

      <div className="hud-top absolute right-4 z-10 flex flex-col items-end gap-1 md:right-6">
        {[...race.players]
          .sort((a, b) => b.claims - a.claims || a.totalClaimMs - b.totalClaimMs)
          .map((p) => (
            <div key={p.id} className="hud-card hud-card-row gap-3">
              <span
                className={`flex items-center gap-2 ${
                  p.id === playerId ? "text-hi" : "text-mid"
                }`}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: playerPalette(p.color).claim }}
                />
                {p.name}
                {!p.connected && <span className="hud-label ml-2 text-faint">gone</span>}
              </span>
              <span className="readout text-hi">{p.claims}</span>
            </div>
          ))}
      </div>
    </>
  );
}
