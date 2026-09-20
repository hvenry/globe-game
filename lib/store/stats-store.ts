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
  /** The Daily 20 result for each UTC date played, keyed `YYYY-MM-DD`. */
  daily: Record<string, DailyResult>;

  recordGame: (record: GameRecord) => void;
  /** Keep the day's best: more correct, or the same score faster. */
  recordDaily: (date: string, result: DailyResult) => void;
}

export interface DailyResult {
  correct: number;
  total: number;
  elapsedSeconds: number;
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
      daily: {},

      recordDaily: (date, result) => {
        const prev = get().daily[date];
        const better =
          !prev ||
          result.correct > prev.correct ||
          (result.correct === prev.correct &&
            result.elapsedSeconds < prev.elapsedSeconds);
        if (better) set({ daily: { ...get().daily, [date]: result } });
      },

      recordGame: ({
        score,
        countrySetId,
        expertMode,
        questionsAnswered,
        questionsCorrect,
      }) => {
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
      version: 2,
      // v1 → v2: added `daily`
      migrate: (persisted) => {
        const p = persisted as Partial<StatsState>;
        return { ...p, daily: p.daily ?? {} } as StatsState;
      },
      // Deep-merge the score records so country sets added in later releases
      // get their default 0 entry instead of reading `undefined` (NaN% bug).
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StatsState>;
        return {
          ...current,
          ...p,
          bestScores: { ...current.bestScores, ...p.bestScores },
          expertBestScores: {
            ...current.expertBestScores,
            ...p.expertBestScores,
          },
        };
      },
    },
  ),
);
