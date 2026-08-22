"use client";

import { useEffect, useState, useMemo } from "react";
import { useGameStore } from "@/lib/store/game-store";
import { formatTime, formatScore } from "@/lib/utils";

export default function ScoreBoard() {
  const phase = useGameStore((s) => s.phase);
  const questionsAnswered = useGameStore((s) => s.questionsAnswered);
  const totalPoints = useGameStore((s) => s.totalPoints);
  const triesRemaining = useGameStore((s) => s.triesRemaining);
  const maxTries = useGameStore((s) => s.maxTries);
  const gameStartTime = useGameStore((s) => s.gameStartTime);
  const totalPausedTime = useGameStore((s) => s.totalPausedTime);
  const gamePausedAt = useGameStore((s) => s.gamePausedAt);

  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (gameStartTime === null) {
      return;
    }

    // Update every second - initial update happens via interval
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100); // Update more frequently for smoother display
    return () => clearInterval(interval);
  }, [gameStartTime]);

  const elapsedTime = useMemo(() => {
    if (gameStartTime === null) return 0;
    const pausedDuration = gamePausedAt !== null ? currentTime - gamePausedAt : 0;
    return (currentTime - gameStartTime - totalPausedTime - pausedDuration) / 1000;
  }, [gameStartTime, totalPausedTime, gamePausedAt, currentTime]);

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

      {gameStartTime !== null && (
        <p className="hud-pill readout text-faint">{formatTime(elapsedTime)}</p>
      )}
    </div>
  );
}
