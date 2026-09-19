"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/lib/store/game-store";
import { useStatsStore } from "@/lib/store/stats-store";
import ExpertResults from "./ExpertResults";
import StandardResults from "./StandardResults";

interface GameOverProps {
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export default function GameOver({ onPlayAgain, onMainMenu }: GameOverProps) {
  const questionsAnswered = useGameStore((s) => s.questionsAnswered);
  const questionsCorrect = useGameStore((s) => s.questionsCorrect);
  const totalPoints = useGameStore((s) => s.totalPoints);
  const expertMode = useGameStore((s) => s.expertMode);
  const countrySetId = useGameStore((s) => s.countrySetId);
  const gameStartTime = useGameStore((s) => s.gameStartTime);
  const gameEndedAt = useGameStore((s) => s.gameEndedAt);
  const totalPausedTime = useGameStore((s) => s.totalPausedTime);
  const bestScores = useStatsStore((s) => s.bestScores);
  const expertBestScores = useStatsStore((s) => s.expertBestScores);
  const recordGame = useStatsStore((s) => s.recordGame);

  // Capture snapshot values once on mount so they don't change as the new
  // result is recorded into the stats store
  const [snapshot] = useState(() => ({
    previousBestScore: bestScores[countrySetId],
    previousExpertBestScore: expertBestScores[countrySetId],
    elapsedSeconds:
      gameStartTime !== null
        ? ((gameEndedAt ?? Date.now()) - gameStartTime - totalPausedTime) / 1000
        : 0,
  }));
  const recorded = useRef(false);

  useEffect(() => {
    if (!recorded.current) {
      recorded.current = true;
      recordGame({
        score: expertMode ? questionsCorrect : totalPoints,
        countrySetId,
        expertMode,
        questionsAnswered,
        questionsCorrect,
      });
    }
  }, [questionsAnswered, questionsCorrect, totalPoints, countrySetId, recordGame, expertMode]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <div className="panel panel-ticks panel-dialog animate-fade-in-up text-center">
        {expertMode ? (
          <ExpertResults
            previousBest={snapshot.previousExpertBestScore}
            elapsedSeconds={snapshot.elapsedSeconds}
          />
        ) : (
          <StandardResults
            previousBest={snapshot.previousBestScore}
            elapsedSeconds={snapshot.elapsedSeconds}
          />
        )}

        <div className="mt-6 space-y-2 md:mt-7 md:space-y-2.5">
          <button
            onClick={onPlayAgain}
            className={`btn-primary ${expertMode ? "btn-expert" : "btn-signal"}`}
          >
            Play again
          </button>
          <button
            onClick={onMainMenu}
            className="btn-ghost"
          >
            Main menu
          </button>
        </div>
      </div>
    </div>
  );
}
