"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useSettingsStore } from "@/lib/store/settings-store";
import { play } from "@/lib/sound/engine";

import { usePinchZoomLock } from "@/lib/hooks/usePinchZoomLock";
import MainMenu from "./MainMenu";
import SettingsView from "./SettingsView";
import CountrySetView from "./CountrySetView";

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
  const [view, setView] = useState<"menu" | "settings" | "countrySet">("menu");
  /** Where the country set panel goes back to: wherever it was opened from. */
  const [setOrigin, setSetOrigin] = useState<"menu" | "settings">("menu");
  // The settings page unmounts while the picker has the panel. Its scroll
  // position is tracked in a ref (a render per scroll event would be waste)
  // and snapshotted into state at the moment the picker opens, so coming
  // back lands on the same spot.
  const settingsScroll = useRef(0);
  const [settingsResumeAt, setSettingsResumeAt] = useState(0);
  const rememberSettingsScroll = useCallback((top: number) => {
    settingsScroll.current = top;
  }, []);
  const lastEscapePress = useRef<number>(0);

  const expertMode = useSettingsStore((s) => s.expertMode);

  // Menu and settings are DOM panels, not the globe — pinching here should do
  // nothing rather than scale the interface. Gameplay is unaffected: this
  // screen is unmounted by then, so the globe keeps its own pinch-to-zoom.
  usePinchZoomLock();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && view !== "menu") {
        e.preventDefault();
        const now = Date.now();
        if (now - lastEscapePress.current < 300) return;
        lastEscapePress.current = now;
        play("ui.click");
        if (view === "settings") setSettingsResumeAt(0);
        setView(view === "countrySet" ? setOrigin : "menu");
      } else if (e.key === "Enter" && view === "menu") {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, setOrigin, onStart]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <div
        className={`panel panel-ticks panel-dialog ${
          view === "settings"
            ? "max-w-[20rem] md:max-w-md"
            : view === "countrySet"
              ? "max-w-[22rem] md:max-w-2xl"
              : ""
        }`}
      >
        {view === "settings" ? (
          <SettingsView
            key="settings"
            onBack={() => {
              setSettingsResumeAt(0);
              setView("menu");
            }}
            onOpenCountrySet={() => {
              setSettingsResumeAt(settingsScroll.current);
              setSetOrigin("settings");
              setView("countrySet");
            }}
            initialScrollTop={settingsResumeAt}
            onScrollTop={rememberSettingsScroll}
            expertMode={expertMode}
          />
        ) : view === "countrySet" ? (
          <CountrySetView
            key="countrySet"
            onBack={() => setView(setOrigin)}
            expertMode={expertMode}
          />
        ) : (
          <MainMenu
            key="menu"
            onStart={onStart}
            onRace={onRace}
            onOpenSettings={() => setView("settings")}
            onOpenCountrySet={() => {
              setSetOrigin("menu");
              setView("countrySet");
            }}
            delayAnimation={delayAnimation}
            expertMode={expertMode}
          />
        )}
      </div>
    </div>
  );
}
