import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CountrySetId } from "@/lib/geo/country-sets";

interface SettingsState {
  // Game mode settings
  countrySet: CountrySetId;
  allowSkips: boolean;
  expertMode: boolean; // One wrong click = game over
  showHints: boolean; // Show country name on incorrect guesses

  // Actions
  setCountrySet: (set: CountrySetId) => void;
  setAllowSkips: (allow: boolean) => void;
  setExpertMode: (expert: boolean) => void;
  setShowHints: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      countrySet: "all",
      allowSkips: true,
      expertMode: false,
      showHints: true,

      setCountrySet: (countrySet) => set({ countrySet }),
      setAllowSkips: (allowSkips) => set({ allowSkips }),
      setExpertMode: (expertMode) => set({ expertMode }),
      setShowHints: (showHints) => set({ showHints }),
    }),
    {
      name: "globe-game-settings",
    }
  )
);
