"use client";

import { useStatsStore } from "@/lib/store/stats-store";
import { dailyKey } from "@/lib/geo/draws";
import {
  setSize,
  setsOfKind,
  type CountrySetConfig,
  type CountrySetId,
} from "@/lib/geo/country-sets";
import type { ThemeMode } from "@/lib/constants";
import { MoonIcon, SunIcon } from "@/components/ui/icons";

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
      aria-pressed={enabled}
      data-sound="toggle"
      className={`flex w-full items-center justify-between rounded-control border p-3 transition-all duration-200 ${
        disabled ? "opacity-40 cursor-default" : "cursor-pointer"
      } ${
        isGold
          ? enabled
            ? "border-expert/50 bg-expert-soft"
            : "border-hairline bg-well hover:border-expert/30"
          : disabled
            ? "border-transparent bg-well"
            : "border-hairline bg-well hover:border-hairline-strong"
      }`}
    >
      <div className="text-left">
        <p
          className={`text-sm font-medium ${
            isGold && enabled ? "text-expert-ink" : "text-hi"
          }`}
        >
          {label}
        </p>
        {description && (
          <p
            className={`mt-0.5 text-xs ${
              isGold && enabled ? "text-expert-ink/60" : "text-low"
            }`}
          >
            {description}
          </p>
        )}
      </div>
      <div
        className={`relative h-5 w-9 rounded-full transition-all duration-200 ${
          enabled ? (isGold ? "bg-expert" : "bg-signal") : "bg-hairline-strong"
        }`}
      >
        <div
          className={`absolute top-1 h-3 w-3 rounded-full bg-ground transition-transform ${
            enabled ? "translate-x-5" : "translate-x-1"
          }`}
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
  /** Fires when the thumb is released (pointer up, or a key released). */
  onCommit?: () => void;
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
  onCommit,
}: SliderProps) {
  const actualMin = min;
  const actualMax = max;
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

  const fillColor = expertMode ? "var(--color-expert)" : "var(--color-signal)";
  const accentClass = expertMode ? "accent-expert" : "accent-signal";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-mid">{label}</p>
        <p className="readout text-xs text-low">{displayValue.toFixed(1)}x</p>
      </div>
      <input
        type="range"
        min={dispMin}
        max={dispMax}
        step={step}
        value={displayValue}
        onChange={(e) => onChange(displayToActual(parseFloat(e.target.value)))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        className={`h-1.5 w-full cursor-pointer appearance-none rounded-full bg-hairline ${accentClass} transition-colors`}
        style={{
          background: `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${displayProgress}%, var(--color-hairline) ${displayProgress}%, var(--color-hairline) 100%)`,
        }}
      />
    </div>
  );
}

// ============================================================================
// Shared option-grid button
// ============================================================================

function OptionButton({
  selected,
  expertStyled,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  expertStyled: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={() => !disabled && onClick()}
      aria-pressed={selected}
      data-sound="toggle"
      disabled={disabled}
      className={`flex min-h-8 items-center justify-center rounded-control border p-2 text-center transition-all duration-200 ${
        disabled ? "opacity-40 cursor-default" : "cursor-pointer"
      } ${
        expertStyled
          ? selected
            ? "border-expert/50 bg-expert-soft"
            : "border-expert/20 bg-well"
          : selected
            ? "border-signal/50 bg-signal-soft"
            : "border-hairline bg-well hover:border-hairline-strong"
      }`}
    >
      {children}
    </button>
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
    <div className="space-y-3">
      <p className="hud-rule hud-label">Max tries</p>
      <div className="grid grid-cols-5 gap-2">
        {options.map((tries) => {
          const isSelected = value === tries;
          const useExpertStyling = expertMode && tries === 1;

          return (
            <OptionButton
              key={tries}
              selected={isSelected}
              expertStyled={useExpertStyling}
              disabled={disabled}
              onClick={() => onChange(tries)}
            >
              <div className="flex gap-0.5">
                {Array.from({ length: tries }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${
                      isSelected
                        ? useExpertStyling
                          ? "bg-expert"
                          : "bg-signal"
                        : "bg-low"
                    }`}
                  />
                ))}
              </div>
            </OptionButton>
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
  /** Seconds on offer; `null` is "no limit". Race mode leaves `null` out. */
  limits?: readonly (number | null)[];
}

const ALL_TIMER_LIMITS: readonly (number | null)[] = [5, 10, 15, 30, null];

export function TimerLimitSelect({
  value,
  onChange,
  disabled = false,
  expertMode = false,
  limits = ALL_TIMER_LIMITS,
}: TimerLimitSelectProps) {
  const options = limits.map((limit) => ({
    label: limit === null ? "None" : `${limit}s`,
    value: limit,
  }));

  return (
    <div className="space-y-3">
      <p className="hud-rule hud-label">Time limit</p>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        }}
      >
        {options.map((option) => {
          const isSelected = value === option.value;
          const useExpertStyling = expertMode && option.value === 5;

          return (
            <OptionButton
              key={option.label}
              selected={isSelected}
              expertStyled={useExpertStyling}
              disabled={disabled}
              onClick={() => onChange(option.value)}
            >
              <p
                className={`readout text-xs font-medium ${
                  isSelected
                    ? useExpertStyling
                      ? "text-expert-ink"
                      : "text-signal"
                    : "text-mid"
                }`}
              >
                {option.label}
              </p>
            </OptionButton>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// ThemeSelect Component
// ============================================================================

interface ThemeSelectProps {
  value: ThemeMode;
  onChange: (value: ThemeMode) => void;
  expertMode?: boolean;
}

export function ThemeSelect({
  value,
  onChange,
  expertMode = false,
}: ThemeSelectProps) {
  const options = [
    { label: "Dark", value: "dark" as const, Icon: MoonIcon },
    { label: "Light", value: "light" as const, Icon: SunIcon },
  ];
  const selectedClass = expertMode ? "text-expert-ink" : "text-signal";

  return (
    <div className="space-y-3">
      <p className="hud-rule hud-label">Appearance</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map(({ label, value: option, Icon }) => {
          const isSelected = value === option;

          return (
            <OptionButton
              key={option}
              selected={isSelected}
              expertStyled={expertMode}
              disabled={false}
              onClick={() => onChange(option)}
            >
              <span
                className={`flex items-center gap-1.5 text-xs font-medium ${
                  isSelected ? selectedClass : "text-mid"
                }`}
              >
                <Icon size={13} />
                {label}
              </span>
            </OptionButton>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// CountrySetSelect Component
// ============================================================================

/** The picker's rails, in the order they read. "all" heads none of them. */
const SET_GROUPS: [label: string, sets: CountrySetConfig[]][] = [
  ["Continents", setsOfKind("continent")],
  ["Regions", setsOfKind("region")],
  ["Quick play", setsOfKind("draw")],
];

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
  const bestScores = useStatsStore((s) => s.bestScores);
  const expertBestScores = useStatsStore((s) => s.expertBestScores);
  const dailyToday = useStatsStore((s) => s.daily[dailyKey()]);

  /** Picking the selected set again clears back to the whole world. */
  const handleSetClick = (setId: CountrySetId) => {
    onChange(value === setId ? "all" : setId);
  };

  const renderSetButton = (set: CountrySetConfig) => {
    const normalBestScore = bestScores[set.id] || 0;
    const expertBestScore = expertBestScores[set.id] || 0;
    const total = setSize(set.id);
    const normalPercentage =
      total > 0 ? Math.floor((normalBestScore / total) * 100) : 0;
    const expertPercentage =
      total > 0 ? Math.floor((expertBestScore / total) * 100) : 0;
    const hasNormalScore = normalBestScore > 0;
    const hasExpertScore = expertBestScore > 0;
    const isSelected = value === set.id;
    const isPerfectNormal = total > 0 && normalBestScore >= total;
    const isPerfectExpert = total > 0 && expertBestScore >= total;

    const borderClass = expertMode
      ? isSelected
        ? "border-expert/60"
        : "border-hairline hover:border-expert/30"
      : isSelected
        ? "border-signal/60"
        : "border-hairline hover:border-signal/30";

    let shimmerClass = "";
    if (isPerfectExpert) {
      shimmerClass =
        "bg-gradient-to-r from-transparent via-expert/15 to-transparent animate-shimmer-gold";
    } else if (isPerfectNormal) {
      shimmerClass =
        "bg-gradient-to-r from-transparent via-signal/15 to-transparent animate-shimmer-signal";
    }

    return (
      <button
        key={set.id}
        onClick={() => handleSetClick(set.id)}
        aria-pressed={isSelected}
        data-sound="toggle"
        className={`group relative rounded-control border p-3 text-left transition-all duration-200 cursor-pointer ${borderClass} ${
          isSelected
            ? expertMode
              ? "bg-expert-soft"
              : "bg-signal-soft"
            : "bg-well hover:bg-panel"
        }`}
      >
        {shimmerClass && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-control">
            <div className={`absolute inset-y-0 w-1/2 ${shimmerClass}`} />
          </div>
        )}

        {/* Two narrow columns on mobile leave no room for a score beside the
            name, so it drops below the count and lays out as a row instead */}
        <div className="relative flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-2">
          <div className="min-w-0 flex-1">
            <p
              className={`mb-0.5 text-sm font-medium transition-colors duration-200 ${
                isSelected
                  ? expertMode
                    ? "text-expert-ink"
                    : "text-signal"
                  : "text-hi"
              }`}
            >
              {set.name}
            </p>
            <p className="readout text-label text-faint">
              {set.draw?.daily && dailyToday
                ? `today ${dailyToday.correct}/${dailyToday.total}`
                : `${total} countries`}
            </p>
          </div>
          {(hasNormalScore || hasExpertScore) && (
            <div className="flex shrink-0 flex-row items-center gap-2.5 md:flex-col md:items-end md:gap-0.5">
              {hasNormalScore && (
                <div className="flex items-center gap-1">
                  <div className="h-1 w-1 rounded-full bg-signal animate-pulse-glow" />
                  <p className="readout text-xs font-medium text-signal">
                    {normalPercentage}%
                  </p>
                </div>
              )}
              {hasExpertScore && (
                <div className="flex items-center gap-1">
                  <div className="h-1 w-1 rounded-full bg-expert animate-pulse-glow" />
                  <p className="readout text-xs font-medium text-expert-ink">
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
    <div className="space-y-5">
      {SET_GROUPS.map(([label, sets]) => (
        <div key={label} className="space-y-3">
          <p className="hud-rule hud-label">{label}</p>
          <div className="grid grid-cols-2 gap-2">
            {sets.map((set) => renderSetButton(set))}
          </div>
        </div>
      ))}
    </div>
  );
}
