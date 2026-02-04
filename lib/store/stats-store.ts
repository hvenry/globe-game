import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CountrySetId } from "@/lib/geo/country-sets";

interface StatsState {
  gamesPlayed: number;
  totalAnswered: number;
  totalCorrect: number;
  bestScores: Record<CountrySetId, number>; // Best score per continent (normal mode) - stores total points
  expertBestScores: Record<CountrySetId, number>; // Best score per continent (expert mode) - stores country count
  bestStreak: number;
  expertGamesPlayed: number;

  recordGame: (
    score: number, // For normal mode: total points; for expert mode: correct count
    countrySetId: CountrySetId,
    expertMode?: boolean
  ) => void;
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set, get) => ({
      gamesPlayed: 0,
      totalAnswered: 0,
      totalCorrect: 0,
      bestScores: {
        all: 0,
        africa: 0,
        asia: 0,
        europe: 0,
        north_america: 0,
        south_america: 0,
        oceania: 0,
      },
      expertBestScores: {
        all: 0,
        africa: 0,
        asia: 0,
        europe: 0,
        north_america: 0,
        south_america: 0,
        oceania: 0,
      },
      bestStreak: 0,
      expertGamesPlayed: 0,

      recordGame: (score, countrySetId, expertMode = false) => {
        const state = get();
        if (expertMode) {
          const newExpertBestScores = { ...state.expertBestScores };
          newExpertBestScores[countrySetId] = Math.max(
            newExpertBestScores[countrySetId] || 0,
            score
          );
          set({
            expertGamesPlayed: state.expertGamesPlayed + 1,
            expertBestScores: newExpertBestScores,
          });
        } else {
          const newBestScores = { ...state.bestScores };
          newBestScores[countrySetId] = Math.max(
            newBestScores[countrySetId] || 0,
            score
          );
          set({
            gamesPlayed: state.gamesPlayed + 1,
            bestScores: newBestScores,
          });
        }
      },
    }),
    {
      name: "globe-game-stats",
    }
  )
);
