"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useStatsStore } from "@/lib/store/stats-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import {
  getAvailableCountrySets,
  type CountrySetId,
} from "@/lib/geo/country-sets";
import { GUESSABLE_IDS } from "@/lib/geo/country-names";
import { TIMER_CONFIG } from "@/lib/constants";

interface StartScreenProps {
  onStart: () => void;
  delayAnimation?: boolean;
}

function AnimatedCounter({
  value,
  duration = 1000,
  delayStart = 0,
}: {
  value: number;
  duration?: number;
  delayStart?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const delayTimeout = setTimeout(() => {
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
    }, delayStart);

    return () => clearTimeout(delayTimeout);
  }, [value, duration, delayStart]);

  return <>{display}</>;
}

function Toggle({
  enabled,
  onChange,
  label,
  description,
  variant = "default",
  disabled = false,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  variant?: "default" | "gold";
  disabled?: boolean;
}) {
  const isGold = variant === "gold";

  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      className={`flex items-center justify-between w-full p-3 rounded-lg transition-all duration-200 ${
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      } ${
        isGold
          ? enabled
            ? "bg-amber-500/15 border border-amber-500/50"
            : "bg-white/5 hover:bg-white/10 border border-amber-500/20"
          : disabled
            ? "bg-white/5 border border-transparent"
            : "bg-white/5 hover:bg-white/10 border border-transparent"
      }`}
    >
      <div className="text-left">
        <p
          className={`text-sm font-medium ${
            isGold && enabled ? "text-amber-400" : "text-white"
          }`}
        >
          {label}
        </p>
        {description && (
          <p
            className={`text-xs mt-0.5 ${
              isGold && enabled ? "text-amber-400/60" : "text-white/40"
            }`}
          >
            {description}
          </p>
        )}
      </div>
      <div
        className={`w-10 h-6 rounded-full transition-all duration-200 relative ${
          enabled
            ? isGold
              ? "bg-gradient-to-r from-amber-500 to-yellow-400"
              : "bg-emerald"
            : "bg-white/20"
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-5" : "translate-x-1"
          } ${isGold && enabled ? "shadow-lg" : ""}`}
        />
      </div>
    </button>
  );
}

function GameModeSelect({
  value,
  onChange,
  expertMode,
}: {
  value: CountrySetId;
  onChange: (value: CountrySetId) => void;
  expertMode: boolean;
}) {
  const availableSets = getAvailableCountrySets();
  const { bestScores, expertBestScores } = useStatsStore();

  // Get actual playable count for each set (intersection of set IDs and guessable countries)
  const getSetTotal = (setId: CountrySetId): number => {
    const set = availableSets.find((s) => s.id === setId);
    if (!set || !set.countryIds) return GUESSABLE_IDS.size;
    return set.countryIds.filter((id) => GUESSABLE_IDS.has(id)).length;
  };

  // Only show continents (exclude "all")
  const continentSets = availableSets.filter((s) => s.id !== "all");

  // Handle toggle - clicking selected continent deselects it (goes back to "all")
  const handleContinentClick = (setId: CountrySetId) => {
    if (value === setId) {
      onChange("all");
    } else {
      onChange(setId);
    }
  };

  const renderSetButton = (
    set: (typeof availableSets)[0],
    isFullWidth = false,
  ) => {
    const normalBestScore = bestScores[set.id] || 0;
    const expertBestScore = expertBestScores[set.id] || 0;
    const total = getSetTotal(set.id);
    const normalPercentage =
      total > 0 ? Math.round((normalBestScore / total) * 100) : 0;
    const expertPercentage =
      total > 0 ? Math.round((expertBestScore / total) * 100) : 0;
    const hasNormalScore = normalBestScore > 0;
    const hasExpertScore = expertBestScore > 0;
    const isSelected = value === set.id;
    const isPerfectNormal = normalPercentage === 100;
    const isPerfectExpert = expertPercentage === 100;
    const isPerfectBoth = isPerfectNormal && isPerfectExpert;

    // Determine border styling based on perfect scores
    let borderClass = "";
    if (isPerfectBoth) {
      borderClass = "border-2 border-amber-400 shadow-lg shadow-amber-400/30";
    } else if (isPerfectExpert) {
      borderClass =
        "border-2 border-amber-400/60 shadow-lg shadow-amber-400/20";
    } else if (isPerfectNormal) {
      borderClass = "border-2 border-emerald shadow-lg shadow-emerald/30";
    } else if (expertMode) {
      borderClass = isSelected
        ? "border-2 border-amber-500/60 shadow-lg shadow-amber-500/20"
        : "border-2 border-white/5 hover:border-amber-500/30";
    } else {
      borderClass = isSelected
        ? "border-2 border-emerald/60 shadow-lg shadow-emerald/20"
        : "border-2 border-white/5 hover:border-emerald/30";
    }

    return (
      <button
        key={set.id}
        onClick={() => handleContinentClick(set.id)}
        className={`group relative p-3 rounded-xl text-left transition-all duration-300 cursor-pointer transform hover:scale-[1.02] ${borderClass} ${
          expertMode
            ? isSelected
              ? "bg-gradient-to-br from-amber-500/20 to-amber-600/10"
              : "bg-white/5 hover:bg-white/10"
            : isSelected
              ? "bg-gradient-to-br from-emerald/25 to-emerald/10"
              : "bg-white/5 hover:bg-white/10"
        }`}
      >
        {/* Animated glow effect on hover */}
        <div
          className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
            expertMode
              ? "bg-gradient-to-br from-amber-500/5 to-transparent"
              : "bg-gradient-to-br from-emerald/5 to-transparent"
          }`}
        />

        <div className="relative flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-semibold mb-0.5 transition-colors duration-200 ${
                expertMode
                  ? isSelected
                    ? "text-amber-400"
                    : "text-white group-hover:text-amber-300"
                  : isSelected
                    ? "text-emerald"
                    : "text-white group-hover:text-emerald-300"
              }`}
            >
              {set.name}
            </p>
            <p className="text-white/50 text-[11px] leading-tight">
              {total} countries
            </p>
          </div>
          {(hasNormalScore || hasExpertScore) && (
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              {hasNormalScore && (
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-emerald animate-pulse-glow" />
                  <p className="text-emerald text-xs font-bold tabular-nums">
                    {normalPercentage}%
                  </p>
                </div>
              )}
              {hasExpertScore && (
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-amber-400 animate-pulse-glow" />
                  <p className="text-amber-400 text-xs font-bold tabular-nums">
                    {expertPercentage}%
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <p className="text-white/50 text-xs uppercase tracking-wider">
          Country Set
        </p>
        {value !== "all" && (
          <p className="text-white/30 text-[10px] italic">
            (Click again to deselect)
          </p>
        )}
      </div>
      {/* Continents - 2x3 Grid */}
      <div className="grid grid-cols-2 gap-2">
        {continentSets.map((set) => renderSetButton(set, false))}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  min = 0.1,
  max = 2.0,
  step = 0.1,
  displayMin,
  displayMax,
  expertMode = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  displayMin?: number;
  displayMax?: number;
  expertMode?: boolean;
}) {
  // If display range is specified, map between actual and display values
  const actualMin = displayMin !== undefined ? min : min;
  const actualMax = displayMax !== undefined ? max : max;
  const dispMin = displayMin ?? min;
  const dispMax = displayMax ?? max;

  // Convert actual value to display value for the slider and label
  const actualToDisplay = (actual: number) => {
    if (displayMin === undefined) return actual;
    return (
      dispMin +
      ((actual - actualMin) * (dispMax - dispMin)) / (actualMax - actualMin)
    );
  };

  // Convert display value from slider to actual value
  const displayToActual = (display: number) => {
    if (displayMin === undefined) return display;
    return (
      actualMin +
      ((display - dispMin) * (actualMax - actualMin)) / (dispMax - dispMin)
    );
  };

  const displayValue = actualToDisplay(value);
  const displayProgress =
    ((displayValue - dispMin) / (dispMax - dispMin)) * 100;

  // Colors for expert vs normal mode
  const fillColor = expertMode ? "rgb(251, 191, 36)" : "rgb(16, 185, 129)"; // amber-400 vs emerald
  const accentClass = expertMode ? "accent-amber-400" : "accent-emerald";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <p className="text-white/60 text-xs">{label}</p>
        <p className="text-white/40 text-xs tabular-nums">
          {displayValue.toFixed(1)}x
        </p>
      </div>
      <input
        type="range"
        min={dispMin}
        max={dispMax}
        step={step}
        value={displayValue}
        onChange={(e) => onChange(displayToActual(parseFloat(e.target.value)))}
        className={`w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer ${accentClass} hover:bg-white/15 transition-colors`}
        style={{
          background: `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${displayProgress}%, rgba(255, 255, 255, 0.1) ${displayProgress}%, rgba(255, 255, 255, 0.1) 100%)`,
        }}
      />
    </div>
  );
}

function MaxTriesSelect({
  value,
  onChange,
  disabled = false,
  expertMode = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  expertMode?: boolean;
}) {
  const options = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-2">
      <p className="text-white/50 text-xs uppercase tracking-wider px-1">
        Max Tries
      </p>
      <div className="grid grid-cols-5 gap-2">
        {options.map((tries) => {
          const isSelected = value === tries;
          const is1Try = tries === 1;
          const useExpertStyling = expertMode && is1Try;

          return (
            <button
              key={tries}
              onClick={() => !disabled && onChange(tries)}
              disabled={disabled}
              className={`p-2 rounded-lg text-center transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              } ${
                useExpertStyling
                  ? isSelected
                    ? "bg-amber-500/15 border border-amber-500/50"
                    : "bg-white/5 border border-amber-500/20"
                  : isSelected
                    ? "bg-emerald/20 border border-emerald/50"
                    : "bg-white/5 hover:bg-white/10 border border-transparent"
              }`}
            >
              <div className="flex gap-0.5">
                {Array.from({ length: tries }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${
                      useExpertStyling
                        ? isSelected
                          ? "bg-amber-400"
                          : "bg-white/40"
                        : isSelected
                          ? "bg-emerald"
                          : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimerLimitSelect({
  value,
  onChange,
  disabled = false,
  expertMode = false,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  expertMode?: boolean;
}) {
  const options: Array<{ label: string; value: number | null }> = [
    { label: "5s", value: 5 },
    { label: "10s", value: 10 },
    { label: "30s", value: 30 },
    { label: "1m", value: 60 },
    { label: "None", value: null },
  ];

  return (
    <div className="space-y-2">
      <p className="text-white/50 text-xs uppercase tracking-wider px-1">
        Time Restriction
      </p>
      <div className="grid grid-cols-5 gap-2">
        {options.map((option) => {
          const isSelected = value === option.value;
          const is5Second = option.value === 5;
          const useExpertStyling = expertMode && is5Second;

          return (
            <button
              key={option.label}
              onClick={() => !disabled && onChange(option.value)}
              disabled={disabled}
              className={`p-2 rounded-lg text-center transition-all duration-200 ${
                disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              } ${
                useExpertStyling
                  ? isSelected
                    ? "bg-amber-500/15 border border-amber-500/50"
                    : "bg-white/5 border border-amber-500/20"
                  : isSelected
                    ? "bg-emerald/20 border border-emerald/50"
                    : "bg-white/5 hover:bg-white/10 border border-transparent"
              }`}
            >
              <p
                className={`text-xs font-medium ${
                  useExpertStyling
                    ? isSelected
                      ? "text-amber-400"
                      : "text-white"
                    : isSelected
                      ? "text-emerald"
                      : "text-white"
                }`}
              >
                {option.label}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function StartScreen({
  onStart,
  delayAnimation = false,
}: StartScreenProps) {
  const [hydrated, setHydrated] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { gamesPlayed, bestScores, expertBestScores, expertGamesPlayed } =
    useStatsStore();

  const countrySet = useSettingsStore((s) => s.countrySet);
  const allowSkips = useSettingsStore((s) => s.allowSkips);
  const expertMode = useSettingsStore((s) => s.expertMode);
  const showHints = useSettingsStore((s) => s.showHints);
  const timerLimit = useSettingsStore((s) => s.timerLimit);
  const maxTries = useSettingsStore((s) => s.maxTries);
  const zoomSpeed = useSettingsStore((s) => s.zoomSpeed);
  const rotateSpeed = useSettingsStore((s) => s.rotateSpeed);
  const setCountrySet = useSettingsStore((s) => s.setCountrySet);
  const setAllowSkips = useSettingsStore((s) => s.setAllowSkips);
  const setExpertMode = useSettingsStore((s) => s.setExpertMode);
  const setShowHints = useSettingsStore((s) => s.setShowHints);
  const setTimerLimit = useSettingsStore((s) => s.setTimerLimit);
  const setMaxTries = useSettingsStore((s) => s.setMaxTries);
  const setZoomSpeed = useSettingsStore((s) => s.setZoomSpeed);
  const setRotateSpeed = useSettingsStore((s) => s.setRotateSpeed);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    // If expert mode is enabled and timer isn't 5 seconds, set it to 5 seconds
    if (expertMode && timerLimit !== TIMER_CONFIG.expertModeLimit) {
      setTimerLimit(TIMER_CONFIG.expertModeLimit);
    }
    // If expert mode is enabled and max tries isn't 1, set it to 1
    if (expertMode && maxTries !== 1) {
      setMaxTries(1);
    }
  }, [expertMode, timerLimit, maxTries, setTimerLimit, setMaxTries]);

  const handleShare = useCallback(() => {
    // Prevent multiple clicks while animation is playing
    if (copied) return;

    const allTotal = GUESSABLE_IDS.size;
    const normalPercentage = Math.round((bestScores.all / allTotal) * 100);
    const expertPercentage = Math.round(
      (expertBestScores.all / allTotal) * 100,
    );

    const makeBar = (percent: number, size = 10) => {
      const clamped = Math.max(0, Math.min(100, percent));

      const filled =
        clamped === 100 ? size : Math.floor((clamped / 100) * size);

      return "█".repeat(filled) + "░".repeat(size - filled);
    };

    let message = "My high score on https://globe.expert";

    if (expertBestScores.all > 0 && bestScores.all > 0) {
      message +=
        `\nExpert  [${makeBar(expertPercentage)}] ${expertPercentage}%` +
        `\nNormal  [${makeBar(normalPercentage)}] ${normalPercentage}%`;
    } else if (expertBestScores.all > 0) {
      message += `\nExpert  [${makeBar(expertPercentage)}] ${expertPercentage}%`;
    } else {
      message += `\nNormal  [${makeBar(normalPercentage)}] ${normalPercentage}%`;
    }

    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [bestScores.all, expertBestScores.all, copied]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showSettings) {
        e.preventDefault();
        setShowSettings(false);
      } else if (e.key === "Enter" && !showSettings) {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSettings, onStart]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight - target.clientHeight;
    let progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    // Treat anything above 99% as fully scrolled to account for floating point precision
    if (progress > 99) progress = 100;
    setScrollProgress(progress);
  }, []);

  // Reset scroll progress when settings are toggled
  useEffect(() => {
    if (showSettings) {
      setScrollProgress(0);
    }
  }, [showSettings]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <div
        className={`animate-fade-in-up bg-black/70 backdrop-blur-md border border-white/10 rounded-2xl p-8 md:p-10 text-center mx-4 w-full ${
          showSettings ? "max-w-md" : "max-w-sm"
        }`}
      >
        {showSettings ? (
          <> </>
        ) : (
          <>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              globe. <br />
              expert
            </h1>
            <p className="text-white/40 text-sm mt-2 mb-6">
              Test your geography
            </p>
          </>
        )}

        {hydrated &&
          (bestScores.all > 0 || expertBestScores.all > 0) &&
          !showSettings &&
          (() => {
            const allTotal = GUESSABLE_IDS.size;
            const normalPercentage = Math.round(
              (bestScores.all / allTotal) * 100,
            );
            const expertPercentage = Math.round(
              (expertBestScores.all / allTotal) * 100,
            );
            const isPerfectNormal = normalPercentage === 100;
            const isPerfectExpert = expertPercentage === 100;
            const isPerfectBoth = isPerfectNormal && isPerfectExpert;

            let borderClass = "";
            if (isPerfectBoth) {
              borderClass =
                "border-2 border-amber-400 shadow-lg shadow-amber-400/30";
            } else if (isPerfectExpert) {
              borderClass =
                "border-2 border-amber-400/60 shadow-lg shadow-amber-400/20";
            } else if (isPerfectNormal) {
              borderClass =
                "border-2 border-emerald shadow-lg shadow-emerald/30";
            } else {
              borderClass = "border border-white/10";
            }

            return (
              <div className="relative mb-6">
                {/* Share button - badge style overlay in top right */}
                <button
                  onClick={handleShare}
                  className="absolute -top-1.5 -right-1.5 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md hover:bg-black/80 border border-white/10 transition-all cursor-pointer group z-20"
                  style={{ pointerEvents: "auto" }}
                  title="Share score"
                >
                  {copied ? (
                    <svg
                      className="w-3 h-3 text-emerald"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-3 h-3 text-white/50 group-hover:text-white/70 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                  )}
                  {/* Minimal copied indicator */}
                  {copied && (
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-emerald text-[10px] font-medium whitespace-nowrap animate-fade-in-out-up">
                      Copied
                    </span>
                  )}
                </button>

                <div
                  className={`relative bg-white/5 rounded-xl p-4 overflow-hidden ${borderClass}`}
                >
                  {/* Animated background shimmer for perfect scores */}
                  {(isPerfectNormal || isPerfectExpert) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                  )}

                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm tracking-wider">
                        Best Score
                      </p>
                      <p className="text-white/40 text-sm mt-0.5">
                        {allTotal} Countries
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {bestScores.all > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse-glow" />
                          <p className="text-emerald text-2xl font-bold tabular-nums">
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
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-glow" />
                          <p className="text-amber-400 text-2xl font-bold tabular-nums">
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
                </div>
              </div>
            );
          })()}

        {showSettings ? (
          <div className="relative flex flex-col" style={{ maxHeight: "56vh" }}>
            {/* Scroll progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald to-amber-400"
                style={{ width: `${scrollProgress}%` }}
              />
            </div>

            {/* Scrollable content */}
            <div
              className="space-y-4 text-left overflow-y-auto pt-4 pb-2 px-1 flex-1 scrollbar-hide"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
              onScroll={handleScroll}
            >
              <GameModeSelect
                value={countrySet}
                onChange={setCountrySet}
                expertMode={expertMode}
              />

              <div className="space-y-3">
                <p className="text-white/50 text-xs uppercase tracking-wider px-1">
                  Camera Controls
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Slider
                    label="Zoom"
                    value={zoomSpeed}
                    onChange={setZoomSpeed}
                    min={0.1}
                    max={1.0}
                    displayMin={0.1}
                    displayMax={2.0}
                    step={0.1}
                    expertMode={expertMode}
                  />
                  <Slider
                    label="Rotate"
                    value={rotateSpeed}
                    onChange={setRotateSpeed}
                    min={0.1}
                    max={2.0}
                    step={0.1}
                    expertMode={expertMode}
                  />
                </div>
              </div>

              <TimerLimitSelect
                value={timerLimit}
                onChange={setTimerLimit}
                disabled={expertMode}
                expertMode={expertMode}
              />

              <MaxTriesSelect
                value={maxTries}
                onChange={setMaxTries}
                disabled={expertMode}
                expertMode={expertMode}
              />

              <div className="space-y-2">
                <p className="text-white/50 text-xs uppercase tracking-wider px-1">
                  Game Options
                </p>
                <div className="space-y-2">
                  <Toggle
                    enabled={allowSkips}
                    onChange={setAllowSkips}
                    label="Allow Skips"
                    description="Navigate between countries freely"
                    disabled={expertMode}
                  />
                  <Toggle
                    enabled={showHints}
                    onChange={setShowHints}
                    label="Show Hints"
                    description="Display country names on incorrect guesses"
                    disabled={expertMode}
                  />
                  <Toggle
                    enabled={expertMode}
                    onChange={setExpertMode}
                    label="Expert Mode"
                    description="One wrong click ends the game"
                    variant="gold"
                  />
                </div>
              </div>
            </div>

            {/* Fixed back button */}
            <button
              onClick={() => setShowSettings(false)}
              className="text-white/40 hover:text-white/60 text-sm transition-colors w-full text-center pt-6 border-t border-white/10 cursor-pointer"
            >
              Back
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Button
                onClick={onStart}
                className={`font-semibold px-8 py-3 text-lg rounded-xl w-full cursor-pointer ${
                  expertMode
                    ? "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black"
                    : "bg-emerald hover:bg-emerald/90 text-black"
                }`}
              >
                {expertMode ? "Start Expert Game" : "Start Game"}
              </Button>
              <p className="text-white/30 text-xs text-center">
                {countrySet === "all"
                  ? "all countries"
                  : getAvailableCountrySets()
                      .find((s) => s.id === countrySet)
                      ?.name.toLowerCase() || "all countries"}
              </p>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="text-white/40 hover:text-white/60 text-sm transition-colors w-full cursor-pointer"
            >
              Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
