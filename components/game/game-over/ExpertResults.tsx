"use client";

import Image from "next/image";
import { useGameStore } from "@/lib/store/game-store";
import { formatTime, formatScore } from "@/lib/utils";
import { getFlagPath } from "@/lib/geo/iso-codes";
import { getCountrySet } from "@/lib/geo/country-sets";
import AnimatedCounter from "@/components/ui/animated-counter";

interface ExpertResultsProps {
  previousBest: number;
  elapsedSeconds: number;
}

export default function ExpertResults({
  previousBest,
  elapsedSeconds,
}: ExpertResultsProps) {
  const questionsCorrect = useGameStore((s) => s.questionsCorrect);
  const totalCountries = useGameStore((s) => s.totalCountries);
  const countrySetId = useGameStore((s) => s.countrySetId);
  const currentCountry = useGameStore((s) => s.currentCountry);
  const lastClickedCountryName = useGameStore((s) => s.lastClickedCountryName);
  const lastClickedCountryId = useGameStore((s) => s.lastClickedCountryId);
  const lastResolution = useGameStore((s) => s.lastResolution);
  const gameStartTime = useGameStore((s) => s.gameStartTime);

  const expertPercentage =
    totalCountries > 0
      ? Math.round((questionsCorrect / totalCountries) * 100)
      : 0;
  const isPerfect = questionsCorrect >= totalCountries && totalCountries > 0;
  const isNewBest = questionsCorrect > previousBest;
  const progress = Math.round((questionsCorrect / totalCountries) * 100);
  const countrySet = getCountrySet(countrySetId);

  const showMiss =
    lastResolution === "failed" &&
    currentCountry &&
    lastClickedCountryName &&
    lastClickedCountryId;

  return (
    <div className="stagger space-y-4 md:space-y-5">
      <div>
        <p className="hud-label text-expert-ink">
          Expert · {countrySet.name}
        </p>
        <p
          className={`readout mt-1.5 text-4xl font-medium md:mt-2 md:text-5xl ${
            isPerfect ? "text-expert-ink" : "text-hi"
          }`}
        >
          <AnimatedCounter value={expertPercentage} duration={1200} />%
        </p>
        {isNewBest ? (
          <p className="hud-label mt-2 text-expert-ink">New best</p>
        ) : (
          <p className="hud-label mt-2">
            Best {formatScore(previousBest / totalCountries)}%
          </p>
        )}
      </div>

      {/* Guessed vs answer — shown when the run ended on a miss */}
      {showMiss && (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-control border border-hairline bg-hairline">
          <div className="bg-well p-3">
            <p className="hud-label text-alert/70">Guessed</p>
            <div className="mt-1.5 flex items-center justify-center gap-1.5">
              <Image
                src={getFlagPath(lastClickedCountryId)}
                alt=""
                width={16}
                height={12}
                className="h-3 w-4 shrink-0 rounded-xs object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <p className="truncate text-sm font-medium text-alert/90">
                {lastClickedCountryName}
              </p>
            </div>
          </div>
          <div className="bg-well p-3">
            <p className="hud-label text-signal/70">Answer</p>
            <div className="mt-1.5 flex items-center justify-center gap-1.5">
              <Image
                src={getFlagPath(currentCountry.id)}
                alt=""
                width={16}
                height={12}
                className="h-3 w-4 shrink-0 rounded-xs object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <p className="truncate text-sm font-medium text-signal">
                {currentCountry.name}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="space-y-2 rounded-control border border-hairline bg-well p-2.5 md:p-3">
        <div className="flex items-center justify-between">
          <p className="readout text-base font-medium text-expert-ink md:text-lg">
            {questionsCorrect}
            <span className="mx-1 text-expert-ink/40">/</span>
            {totalCountries}
          </p>
          {gameStartTime !== null && (
            <p className="readout text-sm text-expert-ink/60">{formatTime(elapsedSeconds)}</p>
          )}
        </div>
        <div className="progress-track">
          <div
            className="h-1 rounded-full bg-expert transition-all duration-500 shadow-[0_0_8px_rgb(var(--expert)/0.4)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
