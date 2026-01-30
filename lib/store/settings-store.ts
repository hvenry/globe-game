import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CountrySetId } from "@/lib/geo/country-sets";

interface SettingsState {
  // Game mode settings
  countrySet: CountrySetId;
  allowSkips: boolean;
  expertMode: boolean; // One wrong click = game over
  showHints: boolean; // Show country name on incorrect guesses
  timerLimit: number | null; // Countdown timer limit in seconds (null = disabled)

  // Saved settings from before expert mode was enabled
  preExpertAllowSkips: boolean;
  preExpertShowHints: boolean;
  preExpertTimerLimit: number | null;

  // Actions
  setCountrySet: (set: CountrySetId) => void;
  setAllowSkips: (allow: boolean) => void;
  setExpertMode: (expert: boolean) => void;
  setShowHints: (show: boolean) => void;
  setTimerLimit: (limit: number | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      countrySet: "all",
      allowSkips: true,
      expertMode: false,
      showHints: true,
      timerLimit: null,

      preExpertAllowSkips: true,
      preExpertShowHints: true,
      preExpertTimerLimit: null,

      setCountrySet: (countrySet) => set({ countrySet }),
      setAllowSkips: (allowSkips) => set({ allowSkips }),
      setExpertMode: (expertMode) => {
        const state = get();
        if (expertMode) {
          // Save current settings before overriding for expert mode
          set({
            expertMode,
            preExpertAllowSkips: state.allowSkips,
            preExpertShowHints: state.showHints,
            preExpertTimerLimit: state.timerLimit,
            allowSkips: false,
            showHints: false,
          });
        } else {
          // Restore previous settings
          set({
            expertMode,
            allowSkips: state.preExpertAllowSkips,
            showHints: state.preExpertShowHints,
            timerLimit: state.preExpertTimerLimit,
          });
        }
      },
      setShowHints: (showHints) => set({ showHints }),
      setTimerLimit: (timerLimit) => set({ timerLimit }),
    }),
    {
      name: "globe-game-settings",
    }
  )
);
