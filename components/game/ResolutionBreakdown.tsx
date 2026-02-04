"use client";

import { ReactNode } from "react";
import type { Resolution } from "@/lib/store/game-store";

export function countResolutions(resolvedCountries: Map<string, Resolution>) {
  let perfect = 0;
  let imperfect = 0;
  let failed = 0;
  resolvedCountries.forEach((res) => {
    if (res === "perfect") perfect++;
    else if (res === "imperfect") imperfect++;
    else failed++;
  });
  return { perfect, imperfect, failed };
}

interface ScoreCardProps {
  scoreContent: ReactNode;
  scoreLabel?: string;
  previousBestLabel?: string;
  perfect: number;
  imperfect: number;
  failed: number;
  isNewBest?: boolean;
}

export default function ScoreCard({
  scoreContent,
  scoreLabel = "Score",
  previousBestLabel,
  perfect,
  imperfect,
  failed,
  isNewBest,
}: ScoreCardProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-left">
          {previousBestLabel && (
            <>
              <p className="text-white/25 text-[10px] uppercase tracking-wider">
                Best
              </p>
              <p className="text-white/30 text-lg font-bold tabular-nums">
                {previousBestLabel}
              </p>
            </>
          )}
        </div>
        <div className="text-right">
          <p className="text-white/25 text-[10px] uppercase tracking-wider">
            {isNewBest ? (
              <span className="text-emerald">New Best!</span>
            ) : (
              scoreLabel
            )}
          </p>
          <p className="text-white text-3xl md:text-4xl font-bold tabular-nums">
            {scoreContent}
          </p>
        </div>
      </div>

      <div className="border-t border-white/5 pt-2">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-emerald text-[10px] uppercase tracking-wider">
              Perfect
            </p>
            <p className="text-emerald text-lg font-bold tabular-nums">
              {perfect}
            </p>
          </div>
          <div>
            <p className="text-yellow-400 text-[10px] uppercase tracking-wider">
              Imperfect
            </p>
            <p className="text-yellow-400 text-lg font-bold tabular-nums">
              {imperfect}
            </p>
          </div>
          <div>
            <p className="text-error text-[10px] uppercase tracking-wider">
              Failed
            </p>
            <p className="text-error text-lg font-bold tabular-nums">
              {failed}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
