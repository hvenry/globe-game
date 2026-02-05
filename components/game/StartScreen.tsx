"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useStatsStore } from "@/lib/store/stats-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { getAvailableCountrySets } from "@/lib/geo/country-sets";
import { GUESSABLE_IDS } from "@/lib/geo/country-names";
import { TIMER_CONFIG } from "@/lib/constants";
import { getAppVersion } from "@/lib/version";
import {
  Toggle,
  Slider,
  MaxTriesSelect,
  TimerLimitSelect,
  CountrySetSelect,
} from "./settings/SettingsControls";

// ============================================================================
// Types
// ============================================================================

interface StartScreenProps {
  onStart: () => void;
  delayAnimation?: boolean;
}

// ============================================================================
// Utility Components
// ============================================================================

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

// Chevron icon for scroll indicator
function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// Settings gear icon
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Back arrow icon
function BackIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

// ============================================================================
// Main Menu View
// ============================================================================

interface MainMenuProps {
  onStart: () => void;
  onOpenSettings: (highlightCountrySet?: boolean) => void;
  delayAnimation: boolean;
  expertMode: boolean;
  countrySet: string;
}

function MainMenu({
  onStart,
  onOpenSettings,
  delayAnimation,
  expertMode,
  countrySet,
}: MainMenuProps) {
  const { bestScores, expertBestScores } = useStatsStore();
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(() => {
    if (copied) return;

    const allTotal = GUESSABLE_IDS.size;
    const normalPercentage = Math.floor((bestScores.all / allTotal) * 100);
    const expertPercentage = Math.floor(
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

  const allTotal = GUESSABLE_IDS.size;
  const hasScores = bestScores.all > 0 || expertBestScores.all > 0;

  // Get current country set name
  const countrySetName =
    countrySet === "all"
      ? "All Countries"
      : getAvailableCountrySets().find((s) => s.id === countrySet)?.name ||
        "All Countries";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
          globe. <br />
          expert
        </h1>
        <p className="text-white/40 text-sm mt-2">Test your geography</p>
      </div>

      {/* Best Scores Card */}
      {hasScores && (
        <BestScoresCard
          bestScores={bestScores}
          expertBestScores={expertBestScores}
          allTotal={allTotal}
          delayAnimation={delayAnimation}
          onShare={handleShare}
          copied={copied}
        />
      )}

      {/* Current Mode Badge */}
      <div className="flex justify-center">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
            expertMode
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-emerald/10 border-emerald/30 text-emerald"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${expertMode ? "bg-amber-400" : "bg-emerald"} animate-pulse-glow`}
          />
          {expertMode ? "Expert Mode" : "Normal Mode"}
          <span className="text-white/40">·</span>
          <button
            onClick={() => onOpenSettings(true)}
            className="group relative cursor-pointer text-white/60 hover:text-white transition-colors hover:scale-105 px-4"
          >
            <span className="absolute left-0 top-0 text-white/60 animate-flash-brackets opacity-0 group-hover:opacity-100">
              &lt;
            </span>
            <span className="group-hover:underline">{countrySetName}</span>
            <span className="absolute right-0 top-0 text-white/60 animate-flash-brackets opacity-0 group-hover:opacity-100">
              &gt;
            </span>
          </button>
        </div>
      </div>

      {/* Action Buttons */}
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

        {/* Settings Button - Made more prominent */}
        <button
          onClick={() => onOpenSettings(false)}
          className={`group flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl transition-all duration-200 cursor-pointer border ${
            expertMode
              ? "border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5"
              : "border-emerald/20 hover:border-emerald/40 hover:bg-emerald/5"
          }`}
        >
          <SettingsIcon
            className={`transition-colors ${
              expertMode
                ? "text-amber-400/60 group-hover:text-amber-400"
                : "text-emerald/60 group-hover:text-emerald"
            }`}
          />
          <span
            className={`text-sm font-medium transition-colors ${
              expertMode
                ? "text-amber-400/60 group-hover:text-amber-400"
                : "text-emerald/60 group-hover:text-emerald"
            }`}
          >
            Game Settings
          </span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Best Scores Card
// ============================================================================

interface BestScoresCardProps {
  bestScores: { all: number };
  expertBestScores: { all: number };
  allTotal: number;
  delayAnimation: boolean;
  onShare: () => void;
  copied: boolean;
}

function BestScoresCard({
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
  const isPerfectBoth = isPerfectNormal && isPerfectExpert;

  let mainShimmerClass = "";
  if (isPerfectBoth) {
    mainShimmerClass =
      "bg-gradient-to-r from-transparent via-amber-400/20 to-transparent animate-shimmer-gold";
  } else if (isPerfectExpert) {
    mainShimmerClass =
      "bg-gradient-to-r from-transparent via-amber-400/15 to-transparent animate-shimmer-gold";
  } else if (isPerfectNormal) {
    mainShimmerClass =
      "bg-gradient-to-r from-transparent via-emerald/15 to-transparent animate-shimmer-emerald";
  }

  return (
    <div className="relative">
      {/* Share button */}
      <button
        onClick={onShare}
        className="absolute -top-1.5 -right-1.5 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md hover:bg-black/80 border border-white/10 transition-all cursor-pointer group z-20"
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
        {copied && (
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-emerald text-[10px] font-medium whitespace-nowrap animate-fade-in-out-up">
            Copied
          </span>
        )}
      </button>

      <div className="relative bg-white/5 rounded-xl p-4 overflow-hidden border border-white/10">
        {mainShimmerClass && (
          <div className={`absolute inset-y-0 w-1/2 ${mainShimmerClass}`} />
        )}

        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-white text-sm tracking-wider">Best Score</p>
            <p className="text-white/40 text-sm mt-0.5">{allTotal} Countries</p>
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
}

// ============================================================================
// Settings View
// ============================================================================

interface SettingsViewProps {
  onBack: () => void;
  expertMode: boolean;
  highlightCountrySet?: boolean;
}

function SettingsView({
  onBack,
  expertMode,
  highlightCountrySet = false,
}: SettingsViewProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [canScroll, setCanScroll] = useState(false);
  const [showHighlight, setShowHighlight] = useState(highlightCountrySet);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fade out the highlight after 2 seconds
  useEffect(() => {
    if (highlightCountrySet) {
      setShowHighlight(true);
      const timer = setTimeout(() => setShowHighlight(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightCountrySet]);

  const countrySet = useSettingsStore((s) => s.countrySet);
  const allowSkips = useSettingsStore((s) => s.allowSkips);
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

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight - target.clientHeight;
    let progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    if (progress > 99) progress = 100;
    setScrollProgress(progress);
  }, []);

  // Check if content is scrollable on mount and resize
  useEffect(() => {
    const checkScrollable = () => {
      if (scrollContainerRef.current) {
        const { scrollHeight, clientHeight } = scrollContainerRef.current;
        setCanScroll(scrollHeight > clientHeight);
      }
    };

    checkScrollable();
    window.addEventListener("resize", checkScrollable);
    return () => window.removeEventListener("resize", checkScrollable);
  }, []);

  return (
    <div className="relative flex flex-col" style={{ maxHeight: "50vh" }}>
      {/* Scroll indicator - absolutely positioned bottom right */}
      {canScroll && scrollProgress < 95 && (
        <div className="absolute bottom-8 right-0 z-10 animate-bounce pointer-events-none">
          <div className="flex flex-col items-center text-white/40">
            <ChevronDown className="w-4 h-4 -mb-1.5" />
            <ChevronDown className="w-4 h-4 opacity-50" />
          </div>
        </div>
      )}

      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className={`flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-lg transition-colors cursor-pointer ${
            expertMode
              ? "text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/10"
              : "text-emerald/70 hover:text-emerald hover:bg-emerald/10"
          }`}
        >
          <BackIcon />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h2 className="text-white/80 text-sm font-medium tracking-wide uppercase">
          Settings
        </h2>
        <div className="w-16" /> {/* Spacer for centering */}
      </div>

      {/* Scroll progress indicator */}
      <div className="relative h-1 bg-white/10 mt-3 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald to-amber-400"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollContainerRef}
        className="space-y-4 text-left overflow-y-auto pt-3 pb-4 px-1 flex-1 scrollbar-hide"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        onScroll={handleScroll}
      >
        <div className="relative">
          {/* Background highlight glow */}
          <div
            className={`absolute inset-0 -m-2 rounded-2xl bg-emerald/15 blur-md transition-opacity duration-500 ${
              showHighlight ? "opacity-100" : "opacity-0"
            }`}
          />
          <CountrySetSelect
            value={countrySet}
            onChange={setCountrySet}
            expertMode={expertMode}
          />
        </div>

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

      {/* Footer */}
      <div className="border-t border-white/10">
        <p className="pt-4 text-white/20 text-xs font-mono text-center">
          {getAppVersion()}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main StartScreen Component
// ============================================================================

export default function StartScreen({
  onStart,
  delayAnimation = false,
}: StartScreenProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [highlightCountrySet, setHighlightCountrySet] = useState(false);
  const lastEscapePress = useRef<number>(0);

  const countrySet = useSettingsStore((s) => s.countrySet);
  const expertMode = useSettingsStore((s) => s.expertMode);
  const timerLimit = useSettingsStore((s) => s.timerLimit);
  const maxTries = useSettingsStore((s) => s.maxTries);
  const setTimerLimit = useSettingsStore((s) => s.setTimerLimit);
  const setMaxTries = useSettingsStore((s) => s.setMaxTries);

  // Sync expert mode settings
  useEffect(() => {
    if (!expertMode) return;

    if (timerLimit !== TIMER_CONFIG.expertModeLimit) {
      setTimerLimit(TIMER_CONFIG.expertModeLimit);
    }
    if (maxTries !== 1) {
      setMaxTries(1);
    }
  }, [expertMode, timerLimit, maxTries, setTimerLimit, setMaxTries]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showSettings) {
        e.preventDefault();
        const now = Date.now();
        if (now - lastEscapePress.current < 300) return;
        lastEscapePress.current = now;
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
      <div
        className={`bg-black/70 backdrop-blur-md border border-white/10 rounded-2xl p-8 md:p-10 text-center mx-4 w-full ${showSettings ? "max-w-md" : "max-w-sm"}`}
      >
        {showSettings ? (
          <SettingsView
            key="settings"
            onBack={() => {
              setShowSettings(false);
              setHighlightCountrySet(false);
            }}
            expertMode={expertMode}
            highlightCountrySet={highlightCountrySet}
          />
        ) : (
          <MainMenu
            key="menu"
            onStart={onStart}
            onOpenSettings={(highlight) => {
              setShowSettings(true);
              setHighlightCountrySet(highlight ?? false);
            }}
            delayAnimation={delayAnimation}
            expertMode={expertMode}
            countrySet={countrySet}
          />
        )}
      </div>
    </div>
  );
}
