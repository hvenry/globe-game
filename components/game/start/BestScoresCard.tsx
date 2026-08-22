"use client";

import AnimatedCounter from "@/components/ui/animated-counter";
import { CheckIcon, ShareIcon } from "@/components/ui/icons";

interface BestScoresCardProps {
  bestScores: { all: number };
  expertBestScores: { all: number };
  allTotal: number;
  delayAnimation: boolean;
  onShare: () => void;
  copied: boolean;
}

export default function BestScoresCard({
  bestScores,
  expertBestScores,
  allTotal,
  delayAnimation,
  onShare,
  copied,
}: BestScoresCardProps) {
  const normalPercentage = Math.floor((bestScores.all / allTotal) * 100);
  const expertPercentage = Math.floor((expertBestScores.all / allTotal) * 100);
  const isPerfectNormal = bestScores.all >= allTotal;
  const isPerfectExpert = expertBestScores.all >= allTotal;

  let shimmerClass = "";
  if (isPerfectExpert) {
    shimmerClass =
      "bg-gradient-to-r from-transparent via-expert/15 to-transparent animate-shimmer-gold";
  } else if (isPerfectNormal) {
    shimmerClass =
      "bg-gradient-to-r from-transparent via-signal/15 to-transparent animate-shimmer-signal";
  }

  return (
    <div className="relative overflow-hidden rounded-control border border-hairline bg-well">
      {shimmerClass && (
        <div className={`absolute inset-y-0 w-1/2 ${shimmerClass}`} />
      )}

      <div className="relative flex flex-col gap-3 p-4 pr-7 md:flex-row md:items-center md:justify-between md:gap-0">
        <div className="text-left">
          <p className="hud-label">Best score</p>
          <p className="readout mt-1 text-label text-faint">
            {allTotal} countries
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:flex md:items-center md:gap-5">
          {bestScores.all > 0 && (
            <div className="text-left md:text-right">
              <p className="hud-label flex items-center gap-1.5 md:justify-end">
                <span className="h-1 w-1 rounded-full bg-signal animate-pulse-glow" />
                Normal
              </p>
              <p className="readout mt-0.5 text-xl font-medium text-signal">
                <AnimatedCounter
                  value={normalPercentage}
                  duration={1200}
                  delayStart={delayAnimation ? 350 : 0}
                />
                %
              </p>
            </div>
          )}
          {expertBestScores.all > 0 && (
            <div className="text-left md:text-right">
              <p className="hud-label flex items-center gap-1.5 md:justify-end">
                <span className="h-1 w-1 rounded-full bg-expert animate-pulse-glow" />
                Expert
              </p>
              <p className="readout mt-0.5 text-xl font-medium text-expert-ink">
                <AnimatedCounter
                  value={expertPercentage}
                  duration={1200}
                  delayStart={delayAnimation ? 350 : 0}
                />
                %
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Share */}
      <button
        onClick={onShare}
        className="absolute right-1.5 top-1.5 p-1.5 text-faint transition-colors cursor-pointer hover:text-mid"
        title="Share score"
      >
        {copied ? (
          <CheckIcon size={12} className="text-signal" />
        ) : (
          <ShareIcon size={12} />
        )}
      </button>
    </div>
  );
}
