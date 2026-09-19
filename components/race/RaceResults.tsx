"use client";

import { useRaceStore, usePlayerInk } from "@/lib/store/race-store";
import { COUNTRY_NAMES } from "@/lib/geo/country-names";
import PlayerDot from "./PlayerDot";

/** The leader reads strongest, then your own row, then everyone else. */
function nameTone(first: boolean, mine: boolean): string {
  if (first) return "font-medium text-hi";
  if (mine) return "text-hi";
  return "text-mid";
}

export default function RaceResults({
  onLobby,
  onBack,
}: {
  /** Reopen the room for another round. */
  onLobby: () => void;
  /** Leave for the main menu. */
  onBack: () => void;
}) {
  const race = useRaceStore((s) => s.race);
  const standings = useRaceStore((s) => s.standings);
  const playerId = useRaceStore((s) => s.playerId);
  const ink = usePlayerInk();

  if (!race || !standings) return null;

  const [leader, runnerUp] = standings;
  // Level on every tiebreak the engine ranks by, so nobody took the lead.
  const drawn =
    runnerUp !== undefined &&
    leader.score === runnerUp.score &&
    leader.claims === runnerUp.claims &&
    leader.totalClaimMs === runnerUp.totalClaimMs;
  const youWin = leader.id === playerId && !drawn;

  return (
    <div className="veil absolute inset-0 z-20 flex items-center justify-center p-4">
      <div className="relative w-full max-w-[17.5rem] md:max-w-sm">
        {/* The banner sits behind the panel and peeks out above it. Only the
            winner's own screen gets it; everyone else reads the ranking. */}
        {youWin && (
          <div
            aria-label="Victory"
            className="absolute -top-9 left-1/2 z-0 -translate-x-1/2 -rotate-2 bg-signal px-10 py-2.5 shadow-[0_0_32px_rgb(var(--signal)/0.5)] md:-top-11 md:px-12 md:py-3"
          >
            <span
              className="block whitespace-nowrap text-xl font-bold uppercase tracking-[0.3em] md:text-2xl"
              style={{ color: "var(--on-signal)" }}
            >
              Victory!
            </span>
          </div>
        )}

        <div
          className={`panel panel-ticks panel-dialog relative z-10 mx-0 ${
            youWin
              ? "border-signal/60 shadow-[0_0_32px_rgb(var(--signal)/0.3)]"
              : ""
          }`}
        >
          {drawn && (
            <p className="hud-label mb-5 text-center text-mid md:mb-6">Draw</p>
          )}

          <ul className="mb-6 flex flex-col gap-2">
            {standings.map((p, i) => {
              const chips: [string, string][] = [
                ["claimed", String(p.claims)],
                ["best", p.bestStreak >= 2 ? `×${p.bestStreak}` : "—"],
                [
                  "avg",
                  p.claims > 0
                    ? `${(p.totalClaimMs / p.claims / 1000).toFixed(1)}s`
                    : "—",
                ],
              ];
              const first = i === 0 && !drawn;
              return (
                <li
                  key={p.id}
                  className={`border px-3 py-2 ${
                    first ? "border-hi" : "border-hairline"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={`readout ${first ? "font-semibold text-hi" : "text-faint"}`}
                      >
                        #{i + 1}
                      </span>
                      <PlayerDot color={p.color} />
                      <span
                        className={`truncate ${nameTone(first, p.id === playerId)}`}
                      >
                        {p.name}
                      </span>
                    </span>
                    <span className="readout shrink-0 text-signal">
                      {p.score.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {chips.map(([label, value]) => (
                      <span
                        key={label}
                        className={`flex min-w-0 items-baseline justify-between gap-1.5 rounded-control border bg-well px-2 py-1 ${
                          first ? "border-hairline-strong" : "border-hairline"
                        }`}
                      >
                        <span
                          className={`hud-label truncate ${first ? "text-mid" : "text-faint"}`}
                        >
                          {label}
                        </span>
                        <span
                          className={`readout shrink-0 text-xs ${first ? "text-hi" : "text-mid"}`}
                        >
                          {value}
                        </span>
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>

          <details className="mb-6">
            <summary className="hud-label cursor-pointer text-low">
              Countries
            </summary>
            <ul className="mt-3 flex max-h-48 flex-col gap-1 overflow-y-auto">
              {race.order.map((id) => {
                const result = race.results[id];
                const owner = result?.by
                  ? race.players.find((p) => p.id === result.by)
                  : undefined;
                return (
                  <li key={id} className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-mid">
                      {COUNTRY_NAMES[id] ?? id}
                    </span>
                    {/* Each claimant in their own colour, so the list can be
                      scanned for who took what without reading it. */}
                    <span
                      className={`flex shrink-0 items-baseline gap-2 ${owner ? "" : "text-faint"}`}
                      style={owner ? { color: ink(owner.color) } : undefined}
                    >
                      {owner?.name ?? "unclaimed"}
                      {result?.points !== undefined && (
                        <span className="readout text-label text-signal">
                          +{result.points}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>

          <button onClick={onLobby} className="btn-primary btn-signal press">
            Back to lobby
          </button>
          <button onClick={onBack} className="btn-quiet press mt-3">
            Back to menu
          </button>
        </div>
      </div>
    </div>
  );
}
