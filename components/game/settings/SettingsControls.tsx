"use client";

import { useStatsStore } from "@/lib/store/stats-store";
import {
  getAvailableCountrySets,
  type CountrySetId,
} from "@/lib/geo/country-sets";
import { GUESSABLE_IDS } from "@/lib/geo/country-names";

// ============================================================================
// Toggle Component
// ============================================================================

interface ToggleProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  variant?: "default" | "gold";
  disabled?: boolean;
}

export function Toggle({
  enabled,
  onChange,
  label,
  description,
  variant = "default",
  disabled = false,
}: ToggleProps) {
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

// ============================================================================
// Slider Component
// ============================================================================

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  displayMin?: number;
  displayMax?: number;
  expertMode?: boolean;
}

export function Slider({
  label,
  value,
  onChange,
  min = 0.1,
  max = 2.0,
  step = 0.1,
  displayMin,
  displayMax,
  expertMode = false,
}: SliderProps) {
  const actualMin = displayMin !== undefined ? min : min;
  const actualMax = displayMax !== undefined ? max : max;
  const dispMin = displayMin ?? min;
  const dispMax = displayMax ?? max;

  const actualToDisplay = (actual: number) => {
    if (displayMin === undefined) return actual;
    return (
      dispMin +
      ((actual - actualMin) * (dispMax - dispMin)) / (actualMax - actualMin)
    );
  };

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

  const fillColor = expertMode ? "rgb(251, 191, 36)" : "rgb(16, 185, 129)";
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

// ============================================================================
// MaxTriesSelect Component
// ============================================================================

interface MaxTriesSelectProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  expertMode?: boolean;
}

export function MaxTriesSelect({
  value,
  onChange,
  disabled = false,
  expertMode = false,
}: MaxTriesSelectProps) {
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

// ============================================================================
// TimerLimitSelect Component
// ============================================================================

interface TimerLimitSelectProps {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  expertMode?: boolean;
}

export function TimerLimitSelect({
  value,
  onChange,
  disabled = false,
  expertMode = false,
}: TimerLimitSelectProps) {
  const options: Array<{ label: string; value: number | null }> = [
    { label: "5s", value: 5 },
    { label: "10s", value: 10 },
    { label: "15s", value: 15 },
    { label: "30s", value: 30 },
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

// ============================================================================
// CountrySetSelect Component (formerly GameModeSelect)
// ============================================================================

interface CountrySetSelectProps {
  value: CountrySetId;
  onChange: (value: CountrySetId) => void;
  expertMode: boolean;
}

export function CountrySetSelect({
  value,
  onChange,
  expertMode,
}: CountrySetSelectProps) {
  const availableSets = getAvailableCountrySets();
  const { bestScores, expertBestScores } = useStatsStore();

  const getSetTotal = (setId: CountrySetId): number => {
    const set = availableSets.find((s) => s.id === setId);
    if (!set || !set.countryIds) return GUESSABLE_IDS.size;
    return set.countryIds.filter((id) => GUESSABLE_IDS.has(id)).length;
  };

  const continentSets = availableSets.filter((s) => s.id !== "all");

  const handleContinentClick = (setId: CountrySetId) => {
    if (value === setId) {
      onChange("all");
    } else {
      onChange(setId);
    }
  };

  const renderSetButton = (set: (typeof availableSets)[0]) => {
    const normalBestScore = bestScores[set.id] || 0;
    const expertBestScore = expertBestScores[set.id] || 0;
    const total = getSetTotal(set.id);
    const normalPercentage =
      total > 0 ? Math.floor((normalBestScore / total) * 100) : 0;
    const expertPercentage =
      total > 0 ? Math.floor((expertBestScore / total) * 100) : 0;
    const hasNormalScore = normalBestScore > 0;
    const hasExpertScore = expertBestScore > 0;
    const isSelected = value === set.id;
    const isPerfectNormal = total > 0 && normalBestScore >= total;
    const isPerfectExpert = total > 0 && expertBestScore >= total;
    const isPerfectBoth = isPerfectNormal && isPerfectExpert;

    let borderClass = "";
    if (expertMode) {
      borderClass = isSelected
        ? "border-2 border-amber-500/60 shadow-lg shadow-amber-500/20"
        : "border-2 border-white/5 hover:border-amber-500/30";
    } else {
      borderClass = isSelected
        ? "border-2 border-emerald/60 shadow-lg shadow-emerald/20"
        : "border-2 border-white/5 hover:border-emerald/30";
    }

    let shimmerClass = "";
    if (isPerfectBoth) {
      shimmerClass =
        "bg-gradient-to-r from-transparent via-amber-400/20 to-transparent animate-shimmer-gold";
    } else if (isPerfectExpert) {
      shimmerClass =
        "bg-gradient-to-r from-transparent via-amber-400/15 to-transparent animate-shimmer-gold";
    } else if (isPerfectNormal) {
      shimmerClass =
        "bg-gradient-to-r from-transparent via-emerald/15 to-transparent animate-shimmer-emerald";
    }

    return (
      <button
        key={set.id}
        onClick={() => handleContinentClick(set.id)}
        className={`group relative p-3 rounded-xl text-left transition-all duration-300 cursor-pointer transform hover:scale-[1.02] ${borderClass} ${
          expertMode
            ? isSelected
              ? "bg-[#1a1a1a] bg-gradient-to-br from-amber-500/20 to-amber-600/10"
              : "bg-[#0a0a0a] hover:bg-[#111]"
            : isSelected
              ? "bg-[#1a1a1a] bg-gradient-to-br from-emerald/25 to-emerald/10"
              : "bg-[#0a0a0a] hover:bg-[#111]"
        }`}
      >
        <div
          className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
            expertMode
              ? "bg-gradient-to-br from-amber-500/5 to-transparent"
              : "bg-gradient-to-br from-emerald/5 to-transparent"
          }`}
        />

        {shimmerClass && (
          <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
            <div className={`absolute inset-y-0 w-1/2 ${shimmerClass}`} />
          </div>
        )}

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
      <div className="grid grid-cols-2 gap-2">
        {continentSets.map((set) => renderSetButton(set))}
      </div>
    </div>
  );
}
