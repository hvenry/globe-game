"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useStatsStore } from "@/lib/store/stats-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import {
  getAvailableCountrySets,
  type CountrySetId,
} from "@/lib/geo/country-sets";
import { TIMER_CONFIG } from "@/lib/constants";

interface StartScreenProps {
  onStart: () => void;
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
}: {
  value: CountrySetId;
  onChange: (value: CountrySetId) => void;
}) {
  const availableSets = getAvailableCountrySets();

  return (
    <div className="space-y-2">
      <p className="text-white/50 text-xs uppercase tracking-wider px-1">
        Country Set
      </p>
      <div className="grid gap-2">
        {availableSets.map((set) => (
          <button
            key={set.id}
            onClick={() => onChange(set.id)}
            className={`p-3 rounded-lg text-left transition-colors cursor-pointer ${
              value === set.id
                ? "bg-emerald/20 border border-emerald/50"
                : "bg-white/5 hover:bg-white/10 border border-transparent"
            }`}
          >
            <p
              className={`text-sm font-medium ${
                value === set.id ? "text-emerald" : "text-white"
              }`}
            >
              {set.name}
            </p>
            <p className="text-white/40 text-xs mt-0.5">{set.description}</p>
          </button>
        ))}
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
    { label: "None", value: null },
    { label: "5s", value: 5 },
    { label: "10s", value: 10 },
    { label: "30s", value: 30 },
    { label: "1m", value: 60 },
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

export default function StartScreen({ onStart }: StartScreenProps) {
  const [hydrated, setHydrated] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { gamesPlayed, bestScore, expertGamesPlayed, expertBestScore } =
    useStatsStore();

  const countrySet = useSettingsStore((s) => s.countrySet);
  const allowSkips = useSettingsStore((s) => s.allowSkips);
  const expertMode = useSettingsStore((s) => s.expertMode);
  const showHints = useSettingsStore((s) => s.showHints);
  const timerLimit = useSettingsStore((s) => s.timerLimit);
  const setCountrySet = useSettingsStore((s) => s.setCountrySet);
  const setAllowSkips = useSettingsStore((s) => s.setAllowSkips);
  const setExpertMode = useSettingsStore((s) => s.setExpertMode);
  const setShowHints = useSettingsStore((s) => s.setShowHints);
  const setTimerLimit = useSettingsStore((s) => s.setTimerLimit);

  // Store previous settings state when expert mode is toggled on
  const previousAllowSkips = useRef<boolean>(allowSkips);
  const previousShowHints = useRef<boolean>(showHints);
  const previousTimerLimit = useRef<number | null>(timerLimit);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    // If expert mode is enabled and timer isn't 5 seconds, set it to 5 seconds
    if (expertMode && timerLimit !== TIMER_CONFIG.expertModeLimit) {
      setTimerLimit(TIMER_CONFIG.expertModeLimit);
    }
  }, [expertMode, timerLimit, setTimerLimit]);

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

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <div className="animate-fade-in-up bg-black/70 backdrop-blur-md border border-white/10 rounded-2xl p-8 md:p-10 text-center max-w-sm mx-4 w-full">
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
          GLOBE
        </h1>
        <p className="text-white/40 text-sm mt-2 mb-6">Test your geography</p>

        {hydrated &&
          (gamesPlayed > 0 || expertGamesPlayed > 0) &&
          !showSettings && (
            <div className="mb-6 space-y-2">
              {gamesPlayed > 0 && (
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white/40 text-xs uppercase tracking-wider">
                    Best Score
                  </p>
                  <p className="text-emerald text-xl font-bold tabular-nums">
                    {Math.round((bestScore / 195) * 100)}%
                  </p>
                </div>
              )}
              {expertGamesPlayed > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <p className="text-amber-400/60 text-xs uppercase tracking-wider">
                    Expert Best
                  </p>
                  <p className="text-amber-400 text-xl font-bold tabular-nums">
                    {Math.round((expertBestScore / 195) * 100)}%
                  </p>
                </div>
              )}
            </div>
          )}

        {showSettings ? (
          <div className="space-y-4 mb-6 text-left">
            <TimerLimitSelect
              value={timerLimit}
              onChange={setTimerLimit}
              disabled={expertMode}
              expertMode={expertMode}
            />

            <GameModeSelect value={countrySet} onChange={setCountrySet} />

            <div className="space-y-2">
              <p className="text-white/50 text-xs uppercase tracking-wider px-1">
                Options
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
                  onChange={(value) => {
                    if (value) {
                      // Save current state before disabling
                      previousAllowSkips.current = allowSkips;
                      previousShowHints.current = showHints;
                      previousTimerLimit.current = timerLimit;
                      setAllowSkips(false);
                      setShowHints(false);
                      setTimerLimit(TIMER_CONFIG.expertModeLimit);
                    } else {
                      // Restore previous state
                      setAllowSkips(previousAllowSkips.current);
                      setShowHints(previousShowHints.current);
                      setTimerLimit(previousTimerLimit.current);
                    }
                    setExpertMode(value);
                  }}
                  label="Expert Mode"
                  description="One wrong click ends the game"
                  variant="gold"
                />
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="text-white/40 hover:text-white/60 text-sm transition-colors w-full text-center pt-2 cursor-pointer"
            >
              Back
            </button>
          </div>
        ) : (
          <div className="space-y-3">
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
