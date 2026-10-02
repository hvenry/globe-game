"use client";

import { useGameStore } from "@/lib/store/game-store";
import { formatScore } from "@/lib/utils";
import GameClock from "./GameClock";

export default function ScoreBoard() {
  const phase = useGameStore((s) => s.phase);
  const questionsAnswered = useGameStore((s) => s.questionsAnswered);
  const totalPoints = useGameStore((s) => s.totalPoints);
  const triesRemaining = useGameStore((s) => s.triesRemaining);
  const maxTries = useGameStore((s) => s.maxTries);
  const gameStartTime = useGameStore((s) => s.gameStartTime);
  const totalPausedTime = useGameStore((s) => s.totalPausedTime);
  const gamePausedAt = useGameStore((s) => s.gamePausedAt);

  if (phase !== "playing" && phase !== "feedback" && phase !== "mustclick") return null;

  // Calculate raw score ratio (0 to 1)
  let scoreRaw: number;

  if (questionsAnswered === 0) {
    scoreRaw = 0;
  } else if (phase === "playing") {
    // During playing: show the score including current question's drag,
    // but NEVER higher than the last feedback score (totalPoints / questionsAnswered).
    // This prevents the score from jumping UP when a new question starts with full tries.
    const baseScore = totalPoints / questionsAnswered;
    const currentQuestionPotential = triesRemaining / maxTries;
    const withCurrent = (totalPoints + currentQuestionPotential) / (questionsAnswered + 1);
    scoreRaw = Math.min(baseScore, withCurrent);
  } else {
    scoreRaw = totalPoints / questionsAnswered;
  }

  const scoreDisplay = formatScore(scoreRaw);

  return (
    <div className="hud-top absolute right-4 z-10 flex flex-col items-end gap-1.5 md:right-6">
      <div className="hud-card hud-card-row">
        <p className="readout font-semibold text-hi">{scoreDisplay}%</p>
      </div>

      {/* Frozen while paused, which includes the intro flight. */}
      {gameStartTime !== null && (
        <GameClock
          startedAt={gameStartTime}
          excludedMs={totalPausedTime}
          frozenAt={gamePausedAt}
        />
      )}
    </div>
  );
}
