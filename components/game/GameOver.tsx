"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGameStore } from "@/lib/store/game-store";
import { useStatsStore } from "@/lib/store/stats-store";
import { formatTime } from "@/lib/utils";

interface GameOverProps {
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

function AnimatedCounter({
  value,
  duration = 1000,
}: {
  value: number;
  duration?: number;
}) {
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
  const countrySetId = useGameStore((s) => s.countrySetId);
  const currentCountry = useGameStore((s) => s.currentCountry);
  const lastClickedCountryName = useGameStore((s) => s.lastClickedCountryName);
  const lastResolution = useGameStore((s) => s.lastResolution);
  const gameStartTime = useGameStore((s) => s.gameStartTime);
  const totalPausedTime = useGameStore((s) => s.totalPausedTime);
  const { bestScores, expertBestScores, recordGame } = useStatsStore();
  const recorded = useRef(false);
  const previousBestScore = useRef(bestScores[countrySetId]);
  const previousExpertBestScore = useRef(expertBestScores[countrySetId]);

  // Capture the previous best scores before they get updated
  if (!recorded.current) {
    previousBestScore.current = bestScores[countrySetId];
    previousExpertBestScore.current = expertBestScores[countrySetId];
  }

  const elapsedSeconds =
    gameStartTime !== null
      ? (Date.now() - gameStartTime - totalPausedTime) / 1000
      : 0;

  const accuracy =
    questionsAnswered > 0
      ? Math.round((questionsCorrect / questionsAnswered) * 100)
      : 0;

  const expertPercentage =
    totalCountries > 0
      ? Math.round((questionsCorrect / totalCountries) * 100)
      : 0;

  const scorePercentage =
    totalCountries > 0
      ? Math.round((questionsCorrect / totalCountries) * 100)
      : 0;
  const isNewBest = !expertMode && questionsCorrect > previousBestScore.current;
  const isNewExpertBest =
    expertMode && questionsCorrect > previousExpertBestScore.current;

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
      recordGame(questionsCorrect, countrySetId, expertMode);
    }
  }, [questionsCorrect, countrySetId, recordGame, expertMode]);

  const isPerfectScore = scorePercentage === 100;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <div
        className={`animate-fade-in-up backdrop-blur-md rounded-2xl p-8 md:p-12 text-center max-w-sm mx-4 ${
          isPerfectScore
            ? expertMode
              ? "bg-gradient-to-b from-amber-950/80 to-black/80 border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.5)]"
              : "bg-gradient-to-b from-emerald-950/80 to-black/80 border-2 border-emerald shadow-[0_0_30px_rgba(16,185,129,0.5)]"
            : expertMode
              ? "bg-gradient-to-b from-amber-950/80 to-black/80 border border-amber-500/30"
              : "bg-black/80 border border-white/10"
        }`}
      >
        {isPerfectScore ? (
          <>
            <h2
              className={`text-2xl font-bold mb-1 ${expertMode ? "text-amber-400" : "text-white"}`}
            >
              Perfect Score!
            </h2>
            <p className={`text-xs ${expertMode ? "text-amber-400/40" : "text-white/40"} tabular-nums`}>
              {questionsCorrect} / {totalCountries}
            </p>
          </>
        ) : expertMode ? (
          <>
            <h2 className="text-2xl font-bold mb-1 text-error">Game Over</h2>
            <p className="text-xs text-amber-400/40 tabular-nums">
              {questionsCorrect} / {totalCountries}
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-1 text-white">Game Overview</h2>
            <p className="text-xs text-white/40 tabular-nums">
              {questionsCorrect} / {totalCountries}
            </p>
          </>
        )}

        {expertMode ? (
          <>
            <div className="mt-4 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 relative">
              <p className="text-amber-400/60 text-xs uppercase tracking-wider">
                Score
              </p>
              <p className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 text-4xl md:text-5xl font-bold tabular-nums mt-1">
                <AnimatedCounter value={expertPercentage} duration={1200} />%
              </p>
              {isNewExpertBest && (
                <div className="absolute -bottom-2.5 -right-2.5">
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 backdrop-blur-md">
                    New Best!
                  </Badge>
                </div>
              )}
            </div>

            {lastResolution === "failed" &&
              currentCountry &&
              lastClickedCountryName && (
                <div className="mb-4 space-y-2">
                  <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-2">
                    <p className="text-red-400/60 text-[10px] uppercase tracking-wider mb-0.5">
                      Your Guess
                    </p>
                    <p className="text-red-400 text-sm font-semibold">
                      {lastClickedCountryName}
                    </p>
                  </div>
                  <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-2">
                    <p className="text-emerald-400/60 text-[10px] uppercase tracking-wider mb-0.5">
                      Correct Answer
                    </p>
                    <p className="text-emerald-400 text-sm font-semibold">
                      {currentCountry.name}
                    </p>
                  </div>
                </div>
              )}
          </>
        ) : (
          <>
            <div className="mt-4 mb-4 grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-white/30 text-xs uppercase tracking-wider">
                  Accuracy
                </p>
                <p className="text-white/60 text-3xl md:text-4xl font-bold tabular-nums mt-1">
                  <AnimatedCounter value={accuracy} duration={1200} />%
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 relative">
                <p className="text-white/30 text-xs uppercase tracking-wider">
                  Score
                </p>
                <p className={`text-3xl md:text-4xl font-bold tabular-nums mt-1 ${
                  scorePercentage === 100
                    ? "text-emerald"
                    : "text-white"
                }`}>
                  <AnimatedCounter value={scorePercentage} duration={1200} />%
                </p>
                {isNewBest && (
                  <div className="absolute -bottom-2.5 -right-2.5">
                    <Badge className="bg-emerald/20 text-emerald border-emerald/30 backdrop-blur-md">
                      New Best!
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4 bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-emerald text-[10px] uppercase tracking-wider">
                    Perfect
                  </p>
                  <p className="text-emerald text-lg font-bold tabular-nums">
                    {perfectCount}
                  </p>
                </div>
                <div>
                  <p className="text-yellow-400 text-[10px] uppercase tracking-wider">
                    Imperfect
                  </p>
                  <p className="text-yellow-400 text-lg font-bold tabular-nums">
                    {imperfectCount}
                  </p>
                </div>
                <div>
                  <p className="text-error text-[10px] uppercase tracking-wider">
                    Failed
                  </p>
                  <p className="text-error text-lg font-bold tabular-nums">
                    {failedCount}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {gameStartTime !== null && (
          <div
            className={`my-4 rounded-lg p-3 ${
              expertMode
                ? "bg-amber-500/10 border border-amber-500/20"
                : "bg-white/5 border border-white/10"
            }`}
          >
            <p
              className={`text-xs uppercase tracking-wider ${
                expertMode ? "text-amber-400/60" : "text-white/40"
              }`}
            >
              Total Time
            </p>
            <p
              className={`text-2xl font-bold tabular-nums mt-1 ${
                expertMode ? "text-amber-400" : "text-white"
              }`}
            >
              {formatTime(elapsedSeconds)}
            </p>
          </div>
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
