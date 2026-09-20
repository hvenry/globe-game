"use client";

import { useSettingsStore } from "@/lib/store/settings-store";
import { getAppVersion } from "@/lib/version";
import PanelHeader from "@/components/ui/PanelHeader";
import ScrollColumn from "@/components/ui/ScrollColumn";
import ControlsSection from "../settings/ControlsSection";
import {
  Toggle,
  MaxTriesSelect,
  TimerLimitSelect,
} from "../settings/SettingsControls";
import { getCountrySet, setSize } from "@/lib/geo/country-sets";

interface SettingsViewProps {
  onBack: () => void;
  onOpenCountrySet: () => void;
  expertMode: boolean;
}

export default function SettingsView({
  onBack,
  onOpenCountrySet,
  expertMode,
}: SettingsViewProps) {
  const countrySet = useSettingsStore((s) => s.countrySet);
  const allowSkips = useSettingsStore((s) => s.allowSkips);
  const showHints = useSettingsStore((s) => s.showHints);
  const timerLimit = useSettingsStore((s) => s.timerLimit);
  const maxTries = useSettingsStore((s) => s.maxTries);
  const setAllowSkips = useSettingsStore((s) => s.setAllowSkips);
  const setExpertMode = useSettingsStore((s) => s.setExpertMode);
  const setShowHints = useSettingsStore((s) => s.setShowHints);
  const setTimerLimit = useSettingsStore((s) => s.setTimerLimit);
  const setMaxTries = useSettingsStore((s) => s.setMaxTries);

  return (
    <ScrollColumn
      header={<PanelHeader title="Settings" onBack={onBack} />}
      accent={expertMode ? "expert" : "signal"}
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

      <section className="border-t border-hairline-strong pt-7">
        <p className="hud-label mb-5 text-center text-mid">Game options</p>

        <div className="space-y-7">
          {/* The picker has its own, wider panel; this is the way in. */}
          <div className="space-y-3">
            <p className="hud-rule hud-label">Country set</p>
            <button
              onClick={onOpenCountrySet}
              className="group w-full cursor-pointer rounded-control border border-hairline bg-well px-3 py-2 text-left transition-colors hover:border-hairline-strong hover:bg-panel"
            >
              <p className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-hi group-hover:underline underline-offset-2">
                  {getCountrySet(countrySet).name}
                </span>
                <span className="readout text-label text-faint">
                  {setSize(countrySet)} countries
                </span>
              </p>
            </button>
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
