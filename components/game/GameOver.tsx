"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/store/game-store";
import { useStatsStore } from "@/lib/store/stats-store";
import Image from "next/image";
import { formatTime, formatScore } from "@/lib/utils";
import { getFlagPath } from "@/lib/geo/iso-codes";
import ScoreCard, { countResolutions } from "./ResolutionBreakdown";

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

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{display}</>;
}

export default function GameOver({ onPlayAgain, onMainMenu }: GameOverProps) {
  const questionsCorrect = useGameStore((s) => s.questionsCorrect);
  const totalPoints = useGameStore((s) => s.totalPoints);
  const totalCountries = useGameStore((s) => s.totalCountries);
  const resolvedCountries = useGameStore((s) => s.resolvedCountries);
  const expertMode = useGameStore((s) => s.expertMode);
  const countrySetId = useGameStore((s) => s.countrySetId);
  const currentCountry = useGameStore((s) => s.currentCountry);
  const lastClickedCountryName = useGameStore((s) => s.lastClickedCountryName);
  const lastClickedCountryId = useGameStore((s) => s.lastClickedCountryId);
  const lastResolution = useGameStore((s) => s.lastResolution);
  const gameStartTime = useGameStore((s) => s.gameStartTime);
  const totalPausedTime = useGameStore((s) => s.totalPausedTime);
  const { bestScores, expertBestScores, recordGame } = useStatsStore();

  // Capture snapshot values once on mount so they don't change during render
  const [snapshot] = useState(() => ({
    previousBestScore: bestScores[countrySetId],
    previousExpertBestScore: expertBestScores[countrySetId],
    elapsedSeconds:
      gameStartTime !== null
        ? (Date.now() - gameStartTime - totalPausedTime) / 1000
        : 0,
  }));
  const recorded = useRef(false);

  const expertPercentage =
    totalCountries > 0
      ? Math.round((questionsCorrect / totalCountries) * 100)
      : 0;

  // GameOver shows final score: totalPoints / totalCountries
  // This accounts for all unanswered countries (they count as 0 points)
  const scoreRaw = totalCountries > 0 ? totalPoints / totalCountries : 0;
  const scorePercentage = Number(formatScore(scoreRaw));

  const isNewBest = !expertMode && totalPoints > snapshot.previousBestScore;
  const isNewExpertBest =
    expertMode && questionsCorrect > snapshot.previousExpertBestScore;

  const {
    perfect: perfectCount,
    imperfect: imperfectCount,
    failed: failedCount,
  } = countResolutions(resolvedCountries);

  useEffect(() => {
    if (!recorded.current) {
      recorded.current = true;
      recordGame(
        expertMode ? questionsCorrect : totalPoints,
        countrySetId,
        expertMode,
      );
    }
  }, [questionsCorrect, totalPoints, countrySetId, recordGame, expertMode]);

  const isPerfectScore = scoreRaw >= 1;

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
          <h2
            className={`text-2xl font-bold mb-1 ${expertMode ? "text-amber-400" : "text-white"}`}
          >
            Perfect Score!
          </h2>
        ) : expertMode ? (
          <h2 className="text-2xl font-bold mb-1 text-error">Game Over</h2>
        ) : (
          <h2 className="text-2xl font-bold mb-1 text-white">Game Overview</h2>
        )}

        {expertMode ? (
          <div className="mt-4 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-amber-400/25 text-[10px] uppercase tracking-wider">
                  Best
                </p>
                <p className="text-amber-400/30 text-lg font-bold tabular-nums">
                  {formatScore(
                    snapshot.previousExpertBestScore / totalCountries,
                  )}
                  %
                </p>
              </div>
              <div className="text-right">
                <p className="text-amber-400/25 text-[10px] uppercase tracking-wider">
                  {isNewExpertBest ? (
                    <span className="text-amber-400">New Best!</span>
                  ) : (
                    "Score"
                  )}
                </p>
                <p className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 text-3xl md:text-4xl font-bold tabular-nums">
                  <AnimatedCounter value={expertPercentage} duration={1200} />%
                </p>
              </div>
            </div>

            {lastResolution === "failed" &&
              currentCountry &&
              lastClickedCountryName &&
              lastClickedCountryId && (
                <div className="border-t border-amber-500/10 pt-2 mt-2 space-y-2 text-center">
                  <div>
                    <p className="text-red-400/50 text-xs uppercase tracking-wider mb-0.5">
                      Guessed
                    </p>
                    <div className="flex items-center justify-center gap-1.5">
                      <Image
                        src={getFlagPath(lastClickedCountryId)}
                        alt=""
                        width={16}
                        height={12}
                        className="w-4 h-3 object-cover rounded-xs shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <p className="text-red-400/80 text-sm font-medium">
                        {lastClickedCountryName}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-emerald-400/50 text-xs uppercase tracking-wider mb-0.5">
                      Answer
                    </p>
                    <div className="flex items-center justify-center gap-1.5">
                      <Image
                        src={getFlagPath(currentCountry.id)}
                        alt=""
                        width={16}
                        height={12}
                        className="w-4 h-3 object-cover rounded-xs shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <p className="text-emerald-400 text-sm font-medium">
                        {currentCountry.name}
                      </p>
                    </div>
                  </div>
                </div>
              )}
          </div>
        ) : (
          <div className="mt-4 mb-4">
            <ScoreCard
              scoreContent={
                <span className={isPerfectScore ? "text-emerald" : ""}>
                  <AnimatedCounter value={scorePercentage} duration={1200} />%
                </span>
              }
              previousBestLabel={`${formatScore(snapshot.previousBestScore / totalCountries)}%`}
              perfect={perfectCount}
              imperfect={imperfectCount}
              failed={failedCount}
              isNewBest={isNewBest}
            />
          </div>
        )}

        {gameStartTime !== null &&
          (expertMode ? (
            <p className="text-amber-400/30 text-xs tabular-nums mb-4">
              Time: {formatTime(snapshot.elapsedSeconds)}
            </p>
          ) : (
            <div className="my-4 rounded-lg p-3 bg-white/5 border border-white/10">
              <p className="text-white/40 text-xs uppercase tracking-wider">
                Total Time
              </p>
              <p className="text-white text-2xl font-bold tabular-nums mt-1">
                {formatTime(snapshot.elapsedSeconds)}
              </p>
            </div>
          ))}

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
