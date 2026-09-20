"use client";

/**
 * The half of settings that is safe to change at any moment: camera feel and
 * theme. Everything here is read live by the globe, so it is the only group
 * the pause menu offers mid-game — and both panels render this one component
 * so the two can never drift apart.
 */

import { useSettingsStore } from "@/lib/store/settings-store";
import { Slider, ThemeSelect, Toggle } from "./SettingsControls";
import { play } from "@/lib/sound/engine";

export default function ControlsSection({
  expertMode,
}: {
  expertMode: boolean;
}) {
  const theme = useSettingsStore((s) => s.theme);
  const zoomSpeed = useSettingsStore((s) => s.zoomSpeed);
  const rotateSpeed = useSettingsStore((s) => s.rotateSpeed);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setZoomSpeed = useSettingsStore((s) => s.setZoomSpeed);
  const setRotateSpeed = useSettingsStore((s) => s.setRotateSpeed);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const soundVolume = useSettingsStore((s) => s.soundVolume);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const setSoundVolume = useSettingsStore((s) => s.setSoundVolume);

  return (
    <div className="space-y-7">
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

      <div className="space-y-3">
        <p className="hud-rule hud-label">Sound</p>
        <Toggle
          enabled={soundEnabled}
          onChange={setSoundEnabled}
          label="Sound"
          description="Clicks, claims, and the countdown"
        />
        {soundEnabled && (
          <Slider
            label="Volume"
            value={soundVolume}
            onChange={setSoundVolume}
            min={0}
            max={1}
            step={0.05}
            expertMode={expertMode}
            // Let go and hear where it landed.
            onCommit={() => play("ui.click", { force: true })}
          />
        )}
      </div>

      <ThemeSelect value={theme} onChange={setTheme} expertMode={expertMode} />
    </div>
  );
}
