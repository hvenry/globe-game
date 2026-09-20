"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/lib/store/game-store";
import { useStatsStore } from "@/lib/store/stats-store";
import { useCopied } from "@/lib/hooks/useCopied";
import ExpertResults from "./ExpertResults";
import StandardResults from "./StandardResults";
import { getCountrySet } from "@/lib/geo/country-sets";
import { dailyKey } from "@/lib/geo/draws";
import { formatTime } from "@/lib/utils";
import { ShareIcon } from "@/components/ui/icons";

interface GameOverProps {
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export default function GameOver({ onPlayAgain, onMainMenu }: GameOverProps) {
  const totalCountries = useGameStore((s) => s.totalCountries);
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
  const recordDaily = useStatsStore((s) => s.recordDaily);
  const { copied, copy } = useCopied();
  const countrySet = getCountrySet(countrySetId);
  const isDaily = countrySet.draw?.daily === true;

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
      if (isDaily) {
        recordDaily(dailyKey(), {
          correct: questionsCorrect,
          total: totalCountries,
          elapsedSeconds: snapshot.elapsedSeconds,
        });
      }
    }
  }, [
    questionsAnswered,
    questionsCorrect,
    totalPoints,
    totalCountries,
    countrySetId,
    isDaily,
    recordGame,
    recordDaily,
    expertMode,
    snapshot.elapsedSeconds,
  ]);

  // The same countries for everyone today, so a result is worth comparing.
  function shareDaily() {
    copy(
      `${countrySet.name} · ${dailyKey()} · ${questionsCorrect}/${totalCountries}` +
        ` · ${formatTime(snapshot.elapsedSeconds)} · https://globe.expert`,
    );
  }

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
          {isDaily && (
            <button
              onClick={shareDaily}
              className="btn-ghost"
              data-sound="none"
            >
              <ShareIcon size={14} />
              <span>{copied ? "Copied" : "Share result"}</span>
            </button>
          )}
          <button onClick={onMainMenu} className="btn-ghost">
            Main menu
          </button>
        </div>
      </div>
    </div>
  );
}
