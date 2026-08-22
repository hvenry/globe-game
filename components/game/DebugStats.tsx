"use client";

import { useGameStore } from "@/lib/store/game-store";
import { formatScore } from "@/lib/utils";
import { isDevVersion } from "@/lib/version";

/**
 * Dev-only stats overlay (F3-style): plain shadowed text at the bottom of
 * the screen, no panel chrome. Renders nothing in production builds.
 */
export default function DebugStats() {
  const phase = useGameStore((s) => s.phase);
  const currentCountry = useGameStore((s) => s.currentCountry);
  const questionsAnswered = useGameStore((s) => s.questionsAnswered);
  const questionsCorrect = useGameStore((s) => s.questionsCorrect);
  const totalCountries = useGameStore((s) => s.totalCountries);
  const triesRemaining = useGameStore((s) => s.triesRemaining);
  const maxTries = useGameStore((s) => s.maxTries);
  const resolvedCountries = useGameStore((s) => s.resolvedCountries);
  const totalPoints = useGameStore((s) => s.totalPoints);

  if (!isDevVersion()) return null;
  if (phase !== "playing" && phase !== "feedback" && phase !== "mustclick") return null;

  let perfect = 0;
  let almost = 0;
  let failed = 0;
  for (const res of Object.values(resolvedCountries)) {
    if (res === "perfect") perfect++;
    else if (res === "almost") almost++;
    else failed++;
  }

  const potential = triesRemaining / maxTries;
  const baseScore = questionsAnswered > 0 ? totalPoints / questionsAnswered : 0;
  const withCurrent =
    questionsAnswered > 0
      ? (totalPoints + potential) / (questionsAnswered + 1)
      : 0;
  const scoreRaw =
    questionsAnswered === 0
      ? 0
      : phase === "playing"
        ? Math.min(baseScore, withCurrent)
        : totalPoints / questionsAnswered;
  const formula =
    questionsAnswered === 0
      ? "0 (no answers yet)"
      : phase === "playing"
        ? `min(${baseScore.toFixed(4)}, ${withCurrent.toFixed(4)})`
        : `${totalPoints.toFixed(4)} / ${questionsAnswered}`;

  const lines: Array<[string, string]> = [
    ["phase", phase],
    ["current", currentCountry?.name ?? "none"],
    ["progress", `${questionsAnswered}/${totalCountries}`],
    ["correct/answered", `${questionsCorrect}/${questionsAnswered}`],
    ["resolutions", `${perfect}P ${almost}I ${failed}F`],
    ["tries", `${triesRemaining}/${maxTries}`],
    ["potential", potential.toFixed(4)],
    ["total points", totalPoints.toFixed(4)],
    ["raw score", scoreRaw.toFixed(6)],
    ["formula", formula],
    ["display", `${formatScore(scoreRaw)}%`],
  ];

  return (
    <div
      className="pointer-events-none absolute bottom-14 right-3 z-10 flex flex-col items-end gap-0 text-right font-data text-[9px] leading-tight md:bottom-4 md:right-4 md:gap-0.5 md:text-[11px]"
      style={{
        color: "var(--hud-ink)",
        textShadow: "1px 1px 0 var(--hud-ink-shadow)",
      }}
    >
      {lines.map(([label, value]) => (
        <p key={label}>
          <span className="opacity-50">{label} </span>
          {value}
        </p>
      ))}
    </div>
  );
}
