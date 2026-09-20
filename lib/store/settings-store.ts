import { create } from "zustand";
import { FEATURES } from "@/lib/flags";
import { persist } from "zustand/middleware";
import type { CountrySetId } from "@/lib/geo/country-sets";
import {
  SOUND_CONFIG,
  TIMER_CONFIG,
  type PlayerColorId,
  type ThemeMode,
} from "@/lib/constants";

interface SettingsState {
  // Appearance
  theme: ThemeMode;
  /** Preferred race identity colour. The room has the last word: it hands
   *  out something else when this one is already taken. */
  playerColor: PlayerColorId;
  /** Last name raced under, so an invite link is one click for a returner. */
  playerName: string;

  // Game mode settings
  countrySet: CountrySetId;
  allowSkips: boolean;
  expertMode: boolean; // One wrong click = game over
  showHints: boolean; // Show country name on incorrect guesses
  timerLimit: number | null; // Countdown timer limit in seconds (null = disabled)
  maxTries: number; // Maximum attempts per country (1-5)

  // Sound
  soundEnabled: boolean;
  /** Master volume, 0–1. */
  soundVolume: number;

  // Camera controls
  zoomSpeed: number; // 0.1 to 1.0 (actual), default 0.53 (displays as 1.0x)
  rotateSpeed: number; // 0.1 to 2.0, default 1.0

  // Saved settings from before expert mode was enabled
  preExpertAllowSkips: boolean;
  preExpertShowHints: boolean;
  preExpertTimerLimit: number | null;
  preExpertMaxTries: number;

  // Actions
  setTheme: (theme: ThemeMode) => void;
  setPlayerColor: (color: PlayerColorId) => void;
  setPlayerName: (name: string) => void;
  setCountrySet: (set: CountrySetId) => void;
  setAllowSkips: (allow: boolean) => void;
  setExpertMode: (expert: boolean) => void;
  setShowHints: (show: boolean) => void;
  setTimerLimit: (limit: number | null) => void;
  setSoundEnabled: (on: boolean) => void;
  setSoundVolume: (volume: number) => void;
  setZoomSpeed: (speed: number) => void;
  setRotateSpeed: (speed: number) => void;
  setMaxTries: (tries: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      playerColor: "blue",
      playerName: "",
      countrySet: "all",
      allowSkips: true,
      expertMode: false,
      showHints: true,
      timerLimit: null,
      maxTries: 3,
      soundEnabled: SOUND_CONFIG.defaultEnabled,
      soundVolume: SOUND_CONFIG.defaultVolume,
      zoomSpeed: 0.53,
      rotateSpeed: 1.0,

      preExpertAllowSkips: true,
      preExpertShowHints: true,
      preExpertTimerLimit: null,
      preExpertMaxTries: 3,

      setTheme: (theme) => set({ theme: FEATURES.lightMode ? theme : "dark" }),
      setPlayerColor: (playerColor) => set({ playerColor }),
      setPlayerName: (playerName) => set({ playerName }),
      setCountrySet: (countrySet) => set({ countrySet }),
      setAllowSkips: (allowSkips) => set({ allowSkips }),
      // Expert mode locks its ruleset in one place: save the player's settings,
      // apply the locked values, and restore on the way out.
      setExpertMode: (expertMode) => {
        const state = get();
        if (expertMode) {
          set({
            expertMode,
            preExpertAllowSkips: state.allowSkips,
            preExpertShowHints: state.showHints,
            preExpertTimerLimit: state.timerLimit,
            preExpertMaxTries: state.maxTries,
            allowSkips: false,
            showHints: false,
            timerLimit: TIMER_CONFIG.expertModeLimit,
            maxTries: 1,
          });
        } else {
          set({
            expertMode,
            allowSkips: state.preExpertAllowSkips,
            showHints: state.preExpertShowHints,
            timerLimit: state.preExpertTimerLimit,
            maxTries: state.preExpertMaxTries,
          });
        }
      },
      setShowHints: (showHints) => set({ showHints }),
      setTimerLimit: (timerLimit) => set({ timerLimit }),
      setMaxTries: (maxTries) => set({ maxTries }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setSoundVolume: (soundVolume) => set({ soundVolume }),
      setZoomSpeed: (zoomSpeed) => set({ zoomSpeed }),
      setRotateSpeed: (rotateSpeed) => set({ rotateSpeed }),
    }),
    {
      name: "globe-game-settings",
      // A theme saved while the flag was on must not survive it being off:
      // the persisted value is overruled on every hydration until then.
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<SettingsState>) };
        return FEATURES.lightMode
          ? merged
          : { ...merged, theme: "dark" as ThemeMode };
      },
      version: 4,
      // v0 → v1: shape unchanged (expert timer lock moved into setExpertMode)
      // v1 → v2: added `theme`; existing players keep the dark globe they
      // already know, so the default is applied rather than system preference
      // v2 → v3: added `playerColor`; the room reassigns it if it is taken,
      // so every returning player starting on blue costs nothing
      // v3 → v4: added sound; on at a moderate level for everyone
      migrate: (persisted, version) => {
        let state = persisted as SettingsState;
        if (version < 2) state = { ...state, theme: "dark" as ThemeMode };
        if (version < 3)
          state = { ...state, playerColor: "blue" as PlayerColorId };
        if (version < 4)
          state = {
            ...state,
            soundEnabled: SOUND_CONFIG.defaultEnabled,
            soundVolume: SOUND_CONFIG.defaultVolume,
          };
        return state;
      },
    },
  ),
);
