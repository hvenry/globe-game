import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CountrySetId } from "@/lib/geo/country-sets";
import { COUNTRY_SETS } from "@/lib/geo/country-sets";

export interface GameRecord {
  /** For normal mode: total points; for expert mode: correct count. */
  score: number;
  countrySetId: CountrySetId;
  expertMode: boolean;
  questionsAnswered: number;
  questionsCorrect: number;
}

interface StatsState {
  gamesPlayed: number;
  expertGamesPlayed: number;
  totalAnswered: number;
  totalCorrect: number;
  bestScores: Record<CountrySetId, number>; // Normal mode: total points per set
  expertBestScores: Record<CountrySetId, number>; // Expert mode: country count per set

  recordGame: (record: GameRecord) => void;
}

function emptyScores(): Record<CountrySetId, number> {
  const scores = {} as Record<CountrySetId, number>;
  for (const set of COUNTRY_SETS) scores[set.id] = 0;
  return scores;
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set, get) => ({
      gamesPlayed: 0,
      expertGamesPlayed: 0,
      totalAnswered: 0,
      totalCorrect: 0,
      bestScores: emptyScores(),
      expertBestScores: emptyScores(),

      recordGame: ({ score, countrySetId, expertMode, questionsAnswered, questionsCorrect }) => {
        const state = get();
        const key = expertMode ? "expertBestScores" : "bestScores";
        const scores = { ...state[key] };
        scores[countrySetId] = Math.max(scores[countrySetId] || 0, score);

        set({
          [key]: scores,
          gamesPlayed: state.gamesPlayed + (expertMode ? 0 : 1),
          expertGamesPlayed: state.expertGamesPlayed + (expertMode ? 1 : 0),
          totalAnswered: state.totalAnswered + questionsAnswered,
          totalCorrect: state.totalCorrect + questionsCorrect,
        });
      },
    }),
    {
      name: "globe-game-stats",
      version: 1,
      migrate: (persisted) => persisted as StatsState,
      // Deep-merge the score records so country sets added in later releases
      // get their default 0 entry instead of reading `undefined` (NaN% bug).
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StatsState>;
        return {
          ...current,
          ...p,
          bestScores: { ...current.bestScores, ...p.bestScores },
          expertBestScores: { ...current.expertBestScores, ...p.expertBestScores },
        };
      },
    }
  )
);
