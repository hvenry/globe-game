"use client";

import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/store/game-store";
import { useStatsStore } from "@/lib/store/stats-store";
import { formatScore } from "@/lib/utils";
import ScoreCard, { countResolutions } from "./ResolutionBreakdown";

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export default function PauseMenu({
  onResume,
  onRestart,
  onMainMenu,
}: PauseMenuProps) {
  const questionsAnswered = useGameStore((s) => s.questionsAnswered);
  const totalPoints = useGameStore((s) => s.totalPoints);
  const totalCountries = useGameStore((s) => s.totalCountries);
  const triesRemaining = useGameStore((s) => s.triesRemaining);
  const maxTries = useGameStore((s) => s.maxTries);
  const resolvedCountries = useGameStore((s) => s.resolvedCountries);
  const expertMode = useGameStore((s) => s.expertMode);
  const countrySetId = useGameStore((s) => s.countrySetId);
  const { bestScores } = useStatsStore();

  // Calculate score: running average capped at last feedback score
  // so it never jumps UP when a new question starts with full tries
  const scoreRaw = questionsAnswered === 0
    ? 0
    : Math.min(
        totalPoints / questionsAnswered,
        (totalPoints + triesRemaining / maxTries) / (questionsAnswered + 1)
      );
  const scoreDisplay = formatScore(scoreRaw);

  const { perfect: perfectCount, imperfect: imperfectCount, failed: failedCount } = countResolutions(resolvedCountries);

  const progress = Math.round((questionsAnswered / totalCountries) * 100);

  // Previous best score as percentage
  const previousBestRaw = bestScores[countrySetId] || 0;
  const previousBestPct = totalCountries > 0
    ? formatScore(previousBestRaw / totalCountries)
    : "0";

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/05 backdrop-blur-lg">
      <div className={`animate-fade-in-up backdrop-blur-md rounded-2xl p-8 md:p-10 text-center max-w-sm mx-4 w-full ${
        expertMode
          ? "bg-gradient-to-b from-amber-950/80 to-black/80 border border-amber-500/30"
          : "bg-black/80 border border-white/10"
      }`}>
        <h2 className={`text-2xl font-bold mb-1 ${expertMode ? "text-amber-400" : "text-white"}`}>
          Paused
        </h2>
        <p className={`text-xs mb-6 ${expertMode ? "text-amber-400/40" : "text-white/40"}`}>
          Press ESC to resume
        </p>

        <div className="mb-6 px-4">
          <p className={`text-xs uppercase tracking-wider ${
            expertMode ? "text-amber-400/60" : "text-white/40"
          }`}>
            Progress
          </p>
          <p className={`text-2xl font-bold tabular-nums mt-1 ${
            expertMode ? "text-amber-400" : "text-white"
          }`}>
            {questionsAnswered} / {totalCountries}
          </p>
          <div className={`w-full rounded-full h-1.5 mt-2 ${
            expertMode ? "bg-amber-500/20" : "bg-white/10"
          }`}>
            <div
              className={`h-1.5 rounded-full transition-all ${
                expertMode ? "bg-amber-400" : "bg-emerald"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {!expertMode && (
          <div className="mb-6">
            <ScoreCard
              scoreContent={<>{scoreDisplay}%</>}
              scoreLabel="Current Score"
              previousBestLabel={`${previousBestPct}%`}
              perfect={perfectCount}
              imperfect={imperfectCount}
              failed={failedCount}
            />
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={onResume}
            className={`font-semibold px-8 py-3 text-lg rounded-xl w-full cursor-pointer ${
              expertMode
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black"
                : "bg-emerald hover:bg-emerald/90 text-black"
            }`}
          >
            Resume
          </Button>
          <button
            onClick={onRestart}
            className={`text-sm transition-colors w-full cursor-pointer py-2 ${
              expertMode
                ? "text-amber-400/50 hover:text-amber-400/70"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            Restart
          </button>
          <button
            onClick={onMainMenu}
            className={`text-sm transition-colors w-full cursor-pointer ${
              expertMode
                ? "text-amber-400/30 hover:text-amber-400/50"
                : "text-white/30 hover:text-white/50"
            }`}
          >
            Quit Game
          </button>
        </div>
      </div>
    </div>
  );
}
