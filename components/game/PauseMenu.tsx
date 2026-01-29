"use client";

import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/store/game-store";

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
  const questionsCorrect = useGameStore((s) => s.questionsCorrect);
  const totalCountries = useGameStore((s) => s.totalCountries);
  const resolvedCountries = useGameStore((s) => s.resolvedCountries);

  const accuracy =
    questionsAnswered > 0
      ? Math.round((questionsCorrect / questionsAnswered) * 100)
      : 0;

  let perfectCount = 0;
  let imperfectCount = 0;
  let failedCount = 0;
  resolvedCountries.forEach((res) => {
    if (res === "perfect") perfectCount++;
    else if (res === "imperfect") imperfectCount++;
    else failedCount++;
  });

  const progress = Math.round((questionsAnswered / totalCountries) * 100);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/05 backdrop-blur-lg">
      <div className="animate-fade-in-up bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-8 md:p-10 text-center max-w-sm mx-4 w-full">
        <h2 className="text-2xl font-bold text-white mb-1">Paused</h2>
        <p className="text-white/40 text-xs mb-6">Press ESC to resume</p>

        <div className="mb-4">
          <p className="text-white/40 text-xs uppercase tracking-wider">
            Progress
          </p>
          <p className="text-white text-2xl font-bold tabular-nums mt-1">
            {questionsAnswered} / {totalCountries}
          </p>
          <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
            <div
              className="bg-emerald h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
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

        <div className="bg-white/5 rounded-lg p-3 mb-6">
          <p className="text-white/40 text-xs uppercase tracking-wider">
            Accuracy
          </p>
          <p className="text-white text-xl font-bold tabular-nums">
            {accuracy}%
          </p>
          <p className="text-white/30 text-xs tabular-nums">
            {questionsCorrect} / {questionsAnswered} correct
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={onResume}
            className="bg-emerald hover:bg-emerald/90 text-black font-semibold px-8 py-3 text-lg rounded-xl w-full cursor-pointer"
          >
            Resume
          </Button>
          <button
            onClick={onRestart}
            className="text-white/50 hover:text-white/70 text-sm transition-colors w-full cursor-pointer py-2"
          >
            Restart
          </button>
          <button
            onClick={onMainMenu}
            className="text-white/30 hover:text-white/50 text-sm transition-colors w-full cursor-pointer"
          >
            Quit Game
          </button>
        </div>
      </div>
    </div>
  );
}
