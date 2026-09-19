"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSettingsStore } from "@/lib/store/settings-store";
import { getAppVersion } from "@/lib/version";
import PanelHeader from "@/components/ui/PanelHeader";
import ControlsSection from "../settings/ControlsSection";
import {
  Toggle,
  MaxTriesSelect,
  TimerLimitSelect,
  CountrySetSelect,
} from "../settings/SettingsControls";

/** Which group the panel opens on. */
export type SettingsFocus = "top" | "gameOptions";

interface SettingsViewProps {
  onBack: () => void;
  focus?: SettingsFocus;
  expertMode: boolean;
}

export default function SettingsView({
  onBack,
  focus = "top",
  expertMode,
}: SettingsViewProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gameOptionsRef = useRef<HTMLElement>(null);

  const theme = useSettingsStore((s) => s.theme);
  const countrySet = useSettingsStore((s) => s.countrySet);
  const allowSkips = useSettingsStore((s) => s.allowSkips);
  const showHints = useSettingsStore((s) => s.showHints);
  const timerLimit = useSettingsStore((s) => s.timerLimit);
  const maxTries = useSettingsStore((s) => s.maxTries);
  const setCountrySet = useSettingsStore((s) => s.setCountrySet);
  const setAllowSkips = useSettingsStore((s) => s.setAllowSkips);
  const setExpertMode = useSettingsStore((s) => s.setExpertMode);
  const setShowHints = useSettingsStore((s) => s.setShowHints);
  const setTimerLimit = useSettingsStore((s) => s.setTimerLimit);
  const setMaxTries = useSettingsStore((s) => s.setMaxTries);

  // Opened from the country-set cell, the panel starts on the group that cell
  // belongs to rather than making the player scroll past the live controls.
  // Written to `scrollTop` rather than `scrollIntoView`, which would also
  // scroll every ancestor that can take it.
  useEffect(() => {
    if (focus !== "gameOptions") return;
    const box = scrollRef.current;
    const section = gameOptionsRef.current;
    if (!box || !section) return;
    box.scrollTop +=
      section.getBoundingClientRect().top - box.getBoundingClientRect().top;
  }, [focus]);

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

  return (
    <div className="relative flex flex-col" style={{ maxHeight: "40vh" }}>
      {/* Header */}
      <PanelHeader title="Settings" onBack={onBack} />

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
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-8 text-left overflow-y-auto overflow-x-hidden pt-4 pb-14 px-3 scrollbar-hide"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          touchAction: "pan-y",
          overscrollBehaviorX: "none",
        }}
        onScroll={handleScroll}
      >
        <section>
          <p className="hud-label mb-5 text-center text-mid">Controls</p>
          <ControlsSection expertMode={expertMode} />
        </section>

        <section ref={gameOptionsRef} className="border-t border-hairline-strong pt-7">
          <p className="hud-label mb-5 text-center text-mid">Game options</p>

          <div className="space-y-7">
            <CountrySetSelect
              value={countrySet}
              onChange={setCountrySet}
              expertMode={expertMode}
            />

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
              <p className="hud-rule hud-label">Rules</p>
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
        </section>
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
