"use client";

import { useCallback, useRef, useState } from "react";
import { useSettingsStore } from "@/lib/store/settings-store";
import { getAppVersion } from "@/lib/version";
import { ChevronLeftIcon, MoonIcon, SunIcon } from "@/components/ui/icons";
import {
  Toggle,
  Slider,
  MaxTriesSelect,
  TimerLimitSelect,
  CountrySetSelect,
} from "../settings/SettingsControls";

interface SettingsViewProps {
  onBack: () => void;
  expertMode: boolean;
  highlightCountrySet?: boolean;
}

export default function SettingsView({
  onBack,
  expertMode,
  highlightCountrySet = false,
}: SettingsViewProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const [showHighlight, setShowHighlight] = useState(highlightCountrySet);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const theme = useSettingsStore((s) => s.theme);
  const countrySet = useSettingsStore((s) => s.countrySet);
  const allowSkips = useSettingsStore((s) => s.allowSkips);
  const showHints = useSettingsStore((s) => s.showHints);
  const timerLimit = useSettingsStore((s) => s.timerLimit);
  const maxTries = useSettingsStore((s) => s.maxTries);
  const zoomSpeed = useSettingsStore((s) => s.zoomSpeed);
  const rotateSpeed = useSettingsStore((s) => s.rotateSpeed);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setCountrySet = useSettingsStore((s) => s.setCountrySet);
  const setAllowSkips = useSettingsStore((s) => s.setAllowSkips);
  const setExpertMode = useSettingsStore((s) => s.setExpertMode);
  const setShowHints = useSettingsStore((s) => s.setShowHints);
  const setTimerLimit = useSettingsStore((s) => s.setTimerLimit);
  const setMaxTries = useSettingsStore((s) => s.setMaxTries);
  const setZoomSpeed = useSettingsStore((s) => s.setZoomSpeed);
  const setRotateSpeed = useSettingsStore((s) => s.setRotateSpeed);

  // Written straight to the node: a re-render per scroll event lands the bar a
  // frame behind the content on top of an already-running WebGL loop.
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const scrollable = el.scrollHeight - el.clientHeight;
    const progress = scrollable > 0 ? (el.scrollTop / scrollable) * 100 : 0;
    if (progressRef.current) {
      progressRef.current.style.width = `${progress > 99 ? 100 : progress}%`;
    }
  }, []);

  const iconButton =
    "press flex h-7 w-7 cursor-pointer items-center justify-center rounded-control border border-hairline text-mid transition-all hover:border-hairline-strong hover:text-hi";

  return (
    <div className="relative flex flex-col" style={{ maxHeight: "50vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          aria-label="Back"
          className={iconButton}
        >
          <ChevronLeftIcon size={13} />
        </button>
        <h2 className="hud-label text-mid">Settings</h2>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          className={iconButton}
        >
          {theme === "dark" ? <MoonIcon size={13} /> : <SunIcon size={13} />}
        </button>
      </div>

      {/* Scroll progress */}
      {/* `shrink-0` is load-bearing: this is a flex item in a height-capped
          column, so without it flex crushed the 1px bar to a third of a pixel
          and the fill was invisible however far you scrolled. */}
      <div className="relative mt-3 h-0.5 shrink-0 overflow-hidden rounded-full bg-hairline">
        <div
          ref={progressRef}
          className={`h-full w-0 rounded-full ${
            expertMode ? "bg-expert" : "bg-signal"
          }`}
        />
      </div>

      {/* Scrollable content — vertical only, with a fade-out scrim at the
          bottom so content sinks into shadow above the footer line */}
      <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 space-y-7 text-left overflow-y-auto overflow-x-hidden pt-4 pb-14 px-3 scrollbar-hide"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          touchAction: "pan-y",
          overscrollBehaviorX: "none",
        }}
        onScroll={handleScroll}
      >
        {/* Stark signal ring that fades out when deep-linked from the menu.
            Drawn as an overlay 8px outside the section so it never touches
            the tiles and has zero effect on section spacing. */}
        <div className="relative">
          {showHighlight && (
            <div
              className="animate-highlight-ring pointer-events-none absolute -inset-2"
              onAnimationEnd={() => setShowHighlight(false)}
            />
          )}
          <CountrySetSelect
            value={countrySet}
            onChange={setCountrySet}
            expertMode={expertMode}
          />
        </div>

        <div className="space-y-3">
          <p className="hud-rule hud-label">Camera</p>
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

        <div className="space-y-3">
          <p className="hud-rule hud-label">Game options</p>
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

      {/* Bottom scrim: content sinks into shadow above the footer line.
          Dark only — the panel is opaque there, so a wash of the panel colour
          matches it exactly. The light panel is frosted glass, where any wash
          reads as a slab laid over the options rather than a fade. */}
      {theme === "dark" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-panel to-transparent" />
      )}
      </div>

      {/* Footer */}
      <div className="border-t border-hairline">
        <p className="readout pt-3 text-label text-faint text-center">
          {getAppVersion()}
        </p>
      </div>
    </div>
  );
}
