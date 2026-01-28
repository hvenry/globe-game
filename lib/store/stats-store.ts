import { create } from "zustand";
import { persist } from "zustand/middleware";

interface StatsState {
  gamesPlayed: number;
  totalAnswered: number;
  totalCorrect: number;
  bestScore: number;
  bestStreak: number;

  recordGame: (
    score: number,
    streak: number,
    answered: number,
    correct: number
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

      recordGame: (score, streak, answered, correct) => {
        const state = get();
        set({
          gamesPlayed: state.gamesPlayed + 1,
          totalAnswered: state.totalAnswered + answered,
          totalCorrect: state.totalCorrect + correct,
          bestScore: Math.max(state.bestScore, score),
          bestStreak: Math.max(state.bestStreak, streak),
        });
      },
    }),
    {
      name: "globe-game-stats",
    }
  )
);
