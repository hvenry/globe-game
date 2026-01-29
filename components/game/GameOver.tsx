"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGameStore } from "@/lib/store/game-store";
import { useStatsStore } from "@/lib/store/stats-store";

interface GameOverProps {
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const startTime = performance.now();
    const startValue = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (value - startValue) * eased);

      setDisplay(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{display}</>;
}

export default function GameOver({ onPlayAgain, onMainMenu }: GameOverProps) {
  const questionsAnswered = useGameStore((s) => s.questionsAnswered);
  const questionsCorrect = useGameStore((s) => s.questionsCorrect);
  const totalCountries = useGameStore((s) => s.totalCountries);
  const resolvedCountries = useGameStore((s) => s.resolvedCountries);
  const expertMode = useGameStore((s) => s.expertMode);
  const currentCountry = useGameStore((s) => s.currentCountry);
  const lastClickedCountryName = useGameStore((s) => s.lastClickedCountryName);
  const lastResolution = useGameStore((s) => s.lastResolution);
  const { bestScore, recordGame } = useStatsStore();
  const recorded = useRef(false);

  const accuracy =
    questionsAnswered > 0
      ? Math.round((questionsCorrect / questionsAnswered) * 100)
      : 0;

  const expertPercentage =
    totalCountries > 0
      ? Math.round((questionsCorrect / totalCountries) * 100)
      : 0;

  const scorePercentage = Math.round((questionsCorrect / 195) * 100);
  const isNewBest = questionsCorrect > bestScore;

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
      recordGame(questionsCorrect, expertMode);
    }
  }, [questionsCorrect, recordGame, expertMode]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <div
        className={`animate-fade-in-up backdrop-blur-md rounded-2xl p-8 md:p-12 text-center max-w-sm mx-4 ${
          expertMode
            ? "bg-gradient-to-b from-amber-950/80 to-black/80 border border-amber-500/30"
            : "bg-black/80 border border-white/10"
        }`}
      >
        <h2 className={`text-2xl font-bold mb-1 ${expertMode ? "text-amber-400" : "text-white"}`}>
          {expertMode ? "Expert Mode" : "Game Over"}
        </h2>

        {expertMode ? (
          <>
            <div className="mt-6 mb-4">
              <p className="text-amber-400/60 text-xs uppercase tracking-wider">
                Countries Found
              </p>
              <p className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 text-5xl md:text-6xl font-bold tabular-nums mt-1">
                <AnimatedCounter value={expertPercentage} duration={1200} />%
              </p>
              <p className="text-amber-400/40 text-sm mt-2 tabular-nums">
                {questionsCorrect} / {totalCountries}
              </p>
            </div>

            {lastResolution === "failed" && currentCountry && lastClickedCountryName && (
              <div className="mb-6 space-y-3">
                <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400/60 text-[10px] uppercase tracking-wider mb-1">
                    Your Guess
                  </p>
                  <p className="text-red-400 text-base font-semibold">
                    {lastClickedCountryName}
                  </p>
                </div>
                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3">
                  <p className="text-emerald-400/60 text-[10px] uppercase tracking-wider mb-1">
                    Correct Answer
                  </p>
                  <p className="text-emerald-400 text-base font-semibold">
                    {currentCountry.name}
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mt-6 mb-6">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider">
                  Accuracy
                </p>
                <p className="text-white text-3xl md:text-4xl font-bold tabular-nums mt-1">
                  <AnimatedCounter value={accuracy} duration={1200} />%
                </p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider">
                  Score
                </p>
                <p className="text-white text-3xl md:text-4xl font-bold tabular-nums mt-1">
                  <AnimatedCounter value={scorePercentage} duration={1200} />%
                </p>
                {isNewBest && (
                  <Badge className="mt-2 bg-emerald/20 text-emerald border-emerald/30">
                    New Best!
                  </Badge>
                )}
              </div>
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
          </>
        )}

        <div className="space-y-3">
          <Button
            onClick={onPlayAgain}
            className={`font-semibold px-8 py-3 text-lg rounded-xl w-full cursor-pointer ${
              expertMode
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black"
                : "bg-emerald hover:bg-emerald/90 text-black"
            }`}
          >
            Play Again
          </Button>
          <button
            onClick={onMainMenu}
            className={`text-sm transition-colors w-full cursor-pointer ${
              expertMode
                ? "text-amber-400/40 hover:text-amber-400/60"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
