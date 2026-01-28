"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGameStore } from "@/lib/store/game-store";
import { useStatsStore } from "@/lib/store/stats-store";

interface GameOverProps {
  onPlayAgain: () => void;
}

export default function GameOver({ onPlayAgain }: GameOverProps) {
  const questionsAnswered = useGameStore((s) => s.questionsAnswered);
  const questionsCorrect = useGameStore((s) => s.questionsCorrect);
  const resolvedCountries = useGameStore((s) => s.resolvedCountries);
  const { bestScore, recordGame } = useStatsStore();
  const recorded = useRef(false);

  const accuracy =
    questionsAnswered > 0
      ? Math.round((questionsCorrect / questionsAnswered) * 100)
      : 0;

  const isNewBest = accuracy > bestScore;

  let perfectCount = 0;
  let imperfectCount = 0;
  let failedCount = 0;
  resolvedCountries.forEach((res) => {
    if (res === "perfect") perfectCount++;
    else if (res === "imperfect") imperfectCount++;
    else failedCount++;
  });

  useEffect(() => {
    if (!recorded.current) {
      recorded.current = true;
      recordGame(accuracy, 0, questionsAnswered, questionsCorrect);
    }
  }, [accuracy, questionsAnswered, questionsCorrect, recordGame]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <div className="animate-fade-in-up bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-8 md:p-12 text-center max-w-sm mx-4">
        <h2 className="text-2xl font-bold text-white mb-1">Game Over</h2>

        <div className="mt-6 mb-2">
          <p className="text-white/40 text-xs uppercase tracking-wider">
            Accuracy
          </p>
          <p className="text-white text-4xl md:text-5xl font-bold tabular-nums mt-1">
            {accuracy}%
          </p>
          {isNewBest && (
            <Badge className="mt-2 bg-emerald/20 text-emerald border-emerald/30">
              New Best!
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 my-6">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-emerald text-[10px] uppercase tracking-wider">
              Perfect
            </p>
            <p className="text-emerald text-lg font-bold tabular-nums">
              {perfectCount}
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-yellow-400 text-[10px] uppercase tracking-wider">
              Imperfect
            </p>
            <p className="text-yellow-400 text-lg font-bold tabular-nums">
              {imperfectCount}
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-error text-[10px] uppercase tracking-wider">
              Failed
            </p>
            <p className="text-error text-lg font-bold tabular-nums">
              {failedCount}
            </p>
          </div>
        </div>

        <Button
          onClick={onPlayAgain}
          className="bg-emerald hover:bg-emerald/90 text-black font-semibold px-8 py-3 text-lg rounded-xl w-full cursor-pointer"
        >
          Play Again
        </Button>
      </div>
    </div>
  );
}
