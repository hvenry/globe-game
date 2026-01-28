import { create } from "zustand";
import { persist } from "zustand/middleware";

export type GameMode = "regular" | "hard";

interface SettingsState {
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      gameMode: "regular",
      setGameMode: (mode) => set({ gameMode: mode }),
    }),
    {
      name: "globe-game-settings",
    }
  )
);
