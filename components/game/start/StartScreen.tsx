"use client";

import { useEffect, useState, useRef } from "react";
import { useSettingsStore } from "@/lib/store/settings-store";
import { play } from "@/lib/sound/engine";

import { usePinchZoomLock } from "@/lib/hooks/usePinchZoomLock";
import MainMenu from "./MainMenu";
import SettingsView, { type SettingsFocus } from "./SettingsView";

interface StartScreenProps {
  onStart: () => void;
  onRace: () => void;
  delayAnimation?: boolean;
}

export default function StartScreen({
  onStart,
  onRace,
  delayAnimation = false,
}: StartScreenProps) {
  const [showSettings, setShowSettings] = useState(false);
  /** Which section the panel should open on, set by whichever entry was used. */
  const [settingsFocus, setSettingsFocus] = useState<SettingsFocus>("top");
  const lastEscapePress = useRef<number>(0);

  const expertMode = useSettingsStore((s) => s.expertMode);

  // Menu and settings are DOM panels, not the globe — pinching here should do
  // nothing rather than scale the interface. Gameplay is unaffected: this
  // screen is unmounted by then, so the globe keeps its own pinch-to-zoom.
  usePinchZoomLock();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showSettings) {
        e.preventDefault();
        const now = Date.now();
        if (now - lastEscapePress.current < 300) return;
        lastEscapePress.current = now;
        play("ui.click");
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
        className={`panel panel-ticks panel-dialog ${
          showSettings ? "max-w-[20rem] md:max-w-md" : ""
        }`}
      >
        {showSettings ? (
          <SettingsView
            key="settings"
            onBack={() => setShowSettings(false)}
            focus={settingsFocus}
            expertMode={expertMode}
          />
        ) : (
          <MainMenu
            key="menu"
            onStart={onStart}
            onRace={onRace}
            onOpenSettings={(focus = "top") => {
              setSettingsFocus(focus);
              setShowSettings(true);
            }}
            delayAnimation={delayAnimation}
            expertMode={expertMode}
          />
        )}
      </div>
    </div>
  );
}
