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

  // Actions
  setCountrySet: (set: CountrySetId) => void;
  setAllowSkips: (allow: boolean) => void;
  setExpertMode: (expert: boolean) => void;
  setShowHints: (show: boolean) => void;
  setTimerLimit: (limit: number | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      countrySet: "all",
      allowSkips: true,
      expertMode: false,
      showHints: true,
      timerLimit: null,

      setCountrySet: (countrySet) => set({ countrySet }),
      setAllowSkips: (allowSkips) => set({ allowSkips }),
      setExpertMode: (expertMode) => set({ expertMode }),
      setShowHints: (showHints) => set({ showHints }),
      setTimerLimit: (timerLimit) => set({ timerLimit }),
    }),
    {
      name: "globe-game-settings",
    }
  )
);
