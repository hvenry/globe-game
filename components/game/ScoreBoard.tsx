"use client";

import { useEffect, useState, useMemo } from "react";
import { useGameStore } from "@/lib/store/game-store";
import { formatTime, formatScore } from "@/lib/utils";
import { isDevVersion } from "@/lib/version";

export default function ScoreBoard() {
  const phase = useGameStore((s) => s.phase);
  const questionsAnswered = useGameStore((s) => s.questionsAnswered);
  const questionsCorrect = useGameStore((s) => s.questionsCorrect);
  const totalPoints = useGameStore((s) => s.totalPoints);
  const totalCountries = useGameStore((s) => s.totalCountries);
  const triesRemaining = useGameStore((s) => s.triesRemaining);
  const maxTries = useGameStore((s) => s.maxTries);
  const resolvedCountries = useGameStore((s) => s.resolvedCountries);
  const currentCountry = useGameStore((s) => s.currentCountry);
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
  } else if (phase === "playing" || phase === "mustclick") {
    // During playing/mustclick: show the score including current question's drag,
    // but NEVER higher than the last feedback score (totalPoints / questionsAnswered).
    // This prevents the score from jumping UP when a new question starts with full tries.
    const baseScore = totalPoints / questionsAnswered;
    const currentQuestionPotential = triesRemaining / maxTries;
    const withCurrent = (totalPoints + currentQuestionPotential) / (questionsAnswered + 1);
    scoreRaw = Math.min(baseScore, withCurrent);
  } else {
    // During feedback: question already counted, just show the actual score
    scoreRaw = totalPoints / questionsAnswered;
  }

  const scoreDisplay = formatScore(scoreRaw);

  return (
    <div className="absolute top-6 right-6 z-10 text-right">
      <p className="text-white/50 text-xs tracking-wider uppercase mb-1">
        Score
      </p>
      <p className="text-white text-2xl md:text-3xl font-bold tabular-nums">
        {scoreDisplay}%
      </p>
      <p className="text-white/40 text-xs mt-1 tabular-nums">
        {questionsAnswered} / {totalCountries}
      </p>
      {gameStartTime !== null && (
        <p className="text-white/30 text-xs mt-2 tabular-nums">
          {formatTime(elapsedTime)}
        </p>
      )}

      {isDevVersion() && (() => {
        let perfectCount = 0;
        let imperfectCount = 0;
        let failedCount = 0;
        resolvedCountries.forEach((res) => {
          if (res === "perfect") perfectCount++;
          else if (res === "imperfect") imperfectCount++;
          else failedCount++;
        });
        const potential = triesRemaining / maxTries;
        const baseScore = questionsAnswered > 0 ? totalPoints / questionsAnswered : 0;
        const withCurrent = questionsAnswered > 0 ? (totalPoints + potential) / (questionsAnswered + 1) : 0;

        return (
          <div className="mt-4 text-left bg-black/80 border border-yellow-400/50 rounded p-2 text-[10px] font-mono">
            <p className="text-yellow-400 font-bold mb-1">DEBUG STATS</p>
            <p className="text-white/70">Phase: <span className="text-yellow-300">{phase}</span></p>
            <p className="text-white/70">Current: <span className="text-yellow-300">{currentCountry?.name ?? "none"}</span></p>
            <p className="text-white/70">Progress: <span className="text-yellow-300">{questionsAnswered}/{totalCountries}</span></p>
            <p className="text-white/70">Correct/Answered: <span className="text-yellow-300">{questionsCorrect}/{questionsAnswered}</span></p>
            <p className="text-white/70">Resolutions: <span className="text-emerald-400">{perfectCount}P</span> <span className="text-yellow-300">{imperfectCount}I</span> <span className="text-red-400">{failedCount}F</span></p>
            <p className="text-white/70 mt-1">Tries: <span className="text-yellow-300">{triesRemaining}/{maxTries}</span></p>
            <p className="text-white/70">Potential: <span className="text-yellow-300">{potential.toFixed(4)}</span></p>
            <p className="text-white/70">Total Points: <span className="text-yellow-300">{totalPoints.toFixed(4)}</span></p>
            <p className="text-white/70">Raw Score: <span className="text-yellow-300">{scoreRaw.toFixed(6)}</span></p>
            <p className="text-white/70 mt-1">Score Formula:</p>
            <p className="text-yellow-300 text-[9px]">
              {questionsAnswered === 0
                ? "0 (no answers yet)"
                : phase === "playing" || phase === "mustclick"
                  ? `min(${baseScore.toFixed(4)}, ${withCurrent.toFixed(4)})`
                  : `${totalPoints.toFixed(4)} / ${questionsAnswered}`
              }
            </p>
            {questionsAnswered > 0 && (phase === "playing" || phase === "mustclick") && (
              <p className="text-white/50 text-[9px]">
                base={formatScore(baseScore)}% with_cur={formatScore(withCurrent)}%
                {withCurrent < baseScore ? " (capped)" : ""}
              </p>
            )}
            <p className="text-white/70 mt-1">Display: <span className="text-yellow-300">{scoreDisplay}%</span></p>
          </div>
        );
      })()}
    </div>
  );
}
