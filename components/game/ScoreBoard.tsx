"use client";

import { useGameStore } from "@/lib/store/game-store";

export default function ScoreBoard() {
  const phase = useGameStore((s) => s.phase);
  const questionsAnswered = useGameStore((s) => s.questionsAnswered);
  const questionsCorrect = useGameStore((s) => s.questionsCorrect);

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
    </div>
  );
}
