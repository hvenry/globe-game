import { create } from "zustand";
import { persist } from "zustand/middleware";

interface StatsState {
  gamesPlayed: number;
  totalAnswered: number;
  totalCorrect: number;
  bestScore: number;
  bestStreak: number;
  expertBestScore: number;
  expertGamesPlayed: number;

  recordGame: (
    correct: number,
    expertMode?: boolean
  ) => void;
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set, get) => ({
      gamesPlayed: 0,
      totalAnswered: 0,
      totalCorrect: 0,
      bestScore: 0,
      bestStreak: 0,
      expertBestScore: 0,
      expertGamesPlayed: 0,

      recordGame: (correct, expertMode = false) => {
        const state = get();
        if (expertMode) {
          set({
            expertGamesPlayed: state.expertGamesPlayed + 1,
            expertBestScore: Math.max(state.expertBestScore, correct),
          });
        } else {
          set({
            gamesPlayed: state.gamesPlayed + 1,
            bestScore: Math.max(state.bestScore, correct),
          });
        }
      },
    }),
    {
      name: "globe-game-stats",
    }
  )
);
