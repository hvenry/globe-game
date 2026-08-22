"use client";

import { useGameStore } from "@/lib/store/game-store";
import { formatTime, formatScore } from "@/lib/utils";
import AnimatedCounter from "@/components/ui/animated-counter";
import ScoreCard, { countResolutions } from "../ResolutionBreakdown";

interface StandardResultsProps {
  previousBest: number;
  elapsedSeconds: number;
}

export default function StandardResults({
  previousBest,
  elapsedSeconds,
}: StandardResultsProps) {
  const questionsCorrect = useGameStore((s) => s.questionsCorrect);
  const totalPoints = useGameStore((s) => s.totalPoints);
  const totalCountries = useGameStore((s) => s.totalCountries);
  const resolvedCountries = useGameStore((s) => s.resolvedCountries);
  const gameStartTime = useGameStore((s) => s.gameStartTime);

  // Final score counts every unanswered country as 0 points
  const scoreRaw = totalCountries > 0 ? totalPoints / totalCountries : 0;
  const scorePercentage = Number(formatScore(scoreRaw));
  const isPerfectScore = scoreRaw >= 1;
  const isNewBest = totalPoints > previousBest;

  const { perfect, almost, failed } = countResolutions(resolvedCountries);
  const progress = Math.round((questionsCorrect / totalCountries) * 100);

  return (
    <div className="stagger space-y-4 md:space-y-5">
      <div>
        <p className={`hud-label ${isPerfectScore ? "text-success" : ""}`}>
          {isPerfectScore ? "Perfect run" : "Run complete"}
        </p>
        <p
          className={`readout mt-1.5 text-4xl font-medium md:mt-2 md:text-5xl ${
            isPerfectScore ? "text-success" : "text-hi"
          }`}
        >
          <AnimatedCounter value={scorePercentage} duration={1200} />%
        </p>
        {isNewBest ? (
          <p className="hud-label mt-2 text-signal">New best</p>
        ) : (
          <p className="hud-label mt-2">
            Best {formatScore(previousBest / totalCountries)}%
          </p>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-2 rounded-control border border-hairline bg-well p-2.5 md:p-3">
        <div className="flex items-center justify-between">
          <p className="readout text-base font-medium text-hi md:text-lg">
            {questionsCorrect}
            <span className="mx-1 text-faint">/</span>
            {totalCountries}
          </p>
          {gameStartTime !== null && (
            <p className="readout text-sm text-low">{formatTime(elapsedSeconds)}</p>
          )}
        </div>
        <div className="progress-track">
          <div
            className="h-1 rounded-full bg-signal transition-all duration-500 shadow-[0_0_8px_rgb(var(--signal)/0.45)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ScoreCard perfect={perfect} almost={almost} failed={failed} />
    </div>
  );
}
