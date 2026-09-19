"use client";

import { useRaceStore, playerPalette, usePlayerInk } from "@/lib/store/race-store";
import { COUNTRY_NAMES } from "@/lib/geo/country-names";

export default function RaceResults({ onBack }: { onBack: () => void }) {
  const race = useRaceStore((s) => s.race);
  const standings = useRaceStore((s) => s.standings);
  const playerId = useRaceStore((s) => s.playerId);
  const ink = usePlayerInk();

  if (!race || !standings) return null;

  const [leader, runnerUp] = standings;
  const drawn =
    runnerUp &&
    leader.claims === runnerUp.claims &&
    leader.totalClaimMs === runnerUp.totalClaimMs;

  return (
    <div className="veil absolute inset-0 z-20 flex items-center justify-center p-4">
      <div className="panel panel-ticks panel-dialog">
        <h1 className="mb-5 text-center text-xl font-medium uppercase tracking-[0.18em] text-hi md:mb-6 md:text-2xl">
          {drawn ? "Draw" : leader.id === playerId ? "You win" : `${leader.name} wins`}
        </h1>

        <ul className="mb-6 flex flex-col gap-2">
          {standings.map((p, i) => (
            <li key={p.id} className="flex items-center justify-between border border-hairline px-3 py-2">
              <span className="flex items-center gap-3">
                <span className="readout text-faint">{i + 1}</span>
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: playerPalette(p.color).claim }}
                />
                <span className={p.id === playerId ? "text-hi" : "text-mid"}>{p.name}</span>
              </span>
              <span className="flex items-center gap-4">
                <span className="hud-label text-faint">
                  {p.claims > 0 ? `${(p.totalClaimMs / p.claims / 1000).toFixed(1)}s avg` : "—"}
                </span>
                <span className="readout text-hi">{p.claims}</span>
              </span>
            </li>
          ))}
        </ul>

        <details className="mb-6">
          <summary className="hud-label cursor-pointer text-low">Countries</summary>
          <ul className="mt-3 flex max-h-48 flex-col gap-1 overflow-y-auto">
            {race.order.map((id) => {
              const result = race.results[id];
              const owner = result?.by
                ? race.players.find((p) => p.id === result.by)
                : undefined;
              return (
                <li key={id} className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-mid">{COUNTRY_NAMES[id] ?? id}</span>
                  {/* Each claimant in their own colour, so the list can be
                      scanned for who took what without reading it. */}
                  <span
                    className={`shrink-0 ${owner ? "" : "text-faint"}`}
                    style={owner ? { color: ink(owner.color) } : undefined}
                  >
                    {owner?.name ?? "unclaimed"}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>

        <button onClick={onBack} className="btn-primary press w-full py-2">
          Back to menu
        </button>
      </div>
    </div>
  );
}
