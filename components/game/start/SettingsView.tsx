"use client";

import { useEffect, useRef } from "react";
import { useSettingsStore } from "@/lib/store/settings-store";
import { getAppVersion } from "@/lib/version";
import PanelHeader from "@/components/ui/PanelHeader";
import ScrollColumn from "@/components/ui/ScrollColumn";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const gameOptionsRef = useRef<HTMLElement>(null);

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

  return (
    <ScrollColumn
      header={<PanelHeader title="Settings" onBack={onBack} />}
      accent={expertMode ? "expert" : "signal"}
      scrollRef={scrollRef}
      footer={
        <div className="border-t border-hairline">
          <p className="readout pt-3 text-label text-faint text-center">
            {getAppVersion()}
          </p>
        </div>
      }
    >
      <section>
        <p className="hud-label mb-5 text-center text-mid">Controls</p>
        <ControlsSection expertMode={expertMode} />
      </section>

      <section
        ref={gameOptionsRef}
        className="border-t border-hairline-strong pt-7"
      >
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
    </ScrollColumn>
  );
}
