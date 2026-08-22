"use client";

import { useEffect, useState, useRef } from "react";
import { useSettingsStore } from "@/lib/store/settings-store";
import { usePinchZoomLock } from "@/lib/hooks/usePinchZoomLock";
import MainMenu from "./MainMenu";
import SettingsView from "./SettingsView";

interface StartScreenProps {
  onStart: () => void;
  delayAnimation?: boolean;
}

export default function StartScreen({
  onStart,
  delayAnimation = false,
}: StartScreenProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [highlightCountrySet, setHighlightCountrySet] = useState(false);
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
          />
        )}
      </div>
    </div>
  );
}
