"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/lib/store/game-store";
import { formatTime } from "@/lib/utils";

export default function ScoreBoard() {
  const phase = useGameStore((s) => s.phase);
  const questionsAnswered = useGameStore((s) => s.questionsAnswered);
  const questionsCorrect = useGameStore((s) => s.questionsCorrect);
  const gameStartTime = useGameStore((s) => s.gameStartTime);
  const totalPausedTime = useGameStore((s) => s.totalPausedTime);
  const gamePausedAt = useGameStore((s) => s.gamePausedAt);

  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (gameStartTime === null) {
      setElapsedTime(0);
      return;
    }

    const updateElapsed = () => {
      const now = Date.now();
      const pausedDuration = gamePausedAt !== null ? now - gamePausedAt : 0;
      const elapsed = (now - gameStartTime - totalPausedTime - pausedDuration) / 1000;
      setElapsedTime(elapsed);
    };

    // Update immediately
    updateElapsed();

    // Update every second
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [gameStartTime, totalPausedTime, gamePausedAt]);

  if (phase !== "playing" && phase !== "feedback") return null;

  const accuracy =
    questionsAnswered > 0
      ? Math.round((questionsCorrect / questionsAnswered) * 100)
      : 0;

  return (
    <div className="absolute top-6 right-6 z-10 text-right">
      <p className="text-white/50 text-xs tracking-wider uppercase mb-1">
        Accuracy
      </p>
      <p className="text-white text-2xl md:text-3xl font-bold tabular-nums">
        {accuracy}%
      </p>
      <p className="text-white/40 text-xs mt-1 tabular-nums">
        {questionsCorrect} / {questionsAnswered} correct
      </p>
      {gameStartTime !== null && (
        <p className="text-white/30 text-xs mt-2 tabular-nums">
          {formatTime(elapsedTime)}
        </p>
      )}
    </div>
  );
}
