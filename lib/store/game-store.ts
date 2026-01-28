import { create } from "zustand";
import type { CountryData } from "@/lib/geo/types";
import { shuffle } from "@/lib/utils";
import { GAME_CONFIG } from "@/lib/constants";
import { baseId, getAllFeatures } from "@/lib/geo/countries";

export type GamePhase = "idle" | "playing" | "feedback" | "gameover";
export type Resolution = "perfect" | "imperfect" | "failed";

export interface FloatingLabel {
  id: string;
  name: string;
  position: [number, number, number]; // 3D position on globe
  createdAt: number;
}

interface GameState {
  phase: GamePhase;
  countryPool: CountryData[];
  currentCountry: CountryData | null;
  triesRemaining: number;
  wrongGuessIds: Set<string>;
  isCorrect: boolean | null;
  lastResolution: Resolution | null;
  lastClickedCountryName: string | null;
  floatingLabels: FloatingLabel[];

  resolvedCountries: Map<string, Resolution>;
  questionsAnswered: number;
  questionsCorrect: number;

  startGame: (countries: CountryData[]) => void;
  makeGuess: (countryId: string) => void;
  addFloatingLabel: (name: string, position: [number, number, number]) => void;
  removeFloatingLabel: (id: string) => void;
  nextCountry: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: "idle",
  countryPool: [],
  currentCountry: null,
  triesRemaining: GAME_CONFIG.maxTries,
  wrongGuessIds: new Set(),
  isCorrect: null,
  lastResolution: null,
  lastClickedCountryName: null,
  floatingLabels: [],

  resolvedCountries: new Map(),
  questionsAnswered: 0,
  questionsCorrect: 0,

  startGame: (countries) => {
    const shuffled = shuffle(countries);
    const [first, ...rest] = shuffled;
    set({
      phase: "playing",
      countryPool: rest,
      currentCountry: first,
      triesRemaining: GAME_CONFIG.maxTries,
      wrongGuessIds: new Set(),
      isCorrect: null,
      lastResolution: null,
      lastClickedCountryName: null,
      floatingLabels: [],
      resolvedCountries: new Map(),
      questionsAnswered: 0,
      questionsCorrect: 0,
    });
  },

  addFloatingLabel: (name, position) => {
    const id = `${Date.now()}-${Math.random()}`;
    set((state) => ({
      floatingLabels: [
        ...state.floatingLabels,
        { id, name, position, createdAt: Date.now() },
      ],
    }));
  },

  removeFloatingLabel: (id) => {
    set((state) => ({
      floatingLabels: state.floatingLabels.filter((label) => label.id !== id),
    }));
  },

  makeGuess: (countryId) => {
    const state = get();
    if (state.phase !== "playing" || !state.currentCountry) return;

    const guessBase = baseId(countryId);
    const isCorrect = guessBase === state.currentCountry.id;

    // Get the name of the guessed country
    let guessedCountryName = "";
    if (!isCorrect) {
      const features = getAllFeatures();
      const guessedFeature = features.find((f) => baseId(f.id) === guessBase);
      guessedCountryName = guessedFeature?.properties.name || "Unknown";
    }

    if (isCorrect) {
      const resolution: Resolution =
        state.triesRemaining === GAME_CONFIG.maxTries ? "perfect" : "imperfect";
      const newResolved = new Map(state.resolvedCountries);
      newResolved.set(state.currentCountry.id, resolution);

      set({
        phase: "feedback",
        isCorrect: true,
        lastResolution: resolution,
        lastClickedCountryName: null,
        resolvedCountries: newResolved,
        questionsAnswered: state.questionsAnswered + 1,
        questionsCorrect: state.questionsCorrect + 1,
      });
    } else {
      const newTries = state.triesRemaining - 1;
      const newWrongIds = new Set(state.wrongGuessIds);
      newWrongIds.add(guessBase);

      if (newTries === 0) {
        const newResolved = new Map(state.resolvedCountries);
        newResolved.set(state.currentCountry.id, "failed");

        set({
          phase: "feedback",
          isCorrect: false,
          triesRemaining: 0,
          wrongGuessIds: newWrongIds,
          lastResolution: "failed",
          lastClickedCountryName: guessedCountryName,
          resolvedCountries: newResolved,
          questionsAnswered: state.questionsAnswered + 1,
        });
      } else {
        set({
          triesRemaining: newTries,
          wrongGuessIds: newWrongIds,
          lastClickedCountryName: guessedCountryName,
        });
      }
    }
  },

  nextCountry: () => {
    const state = get();
    if (state.countryPool.length === 0) {
      set({ phase: "gameover" });
      return;
    }
    const [next, ...rest] = state.countryPool;
    set({
      phase: "playing",
      countryPool: rest,
      currentCountry: next,
      triesRemaining: GAME_CONFIG.maxTries,
      wrongGuessIds: new Set(),
      isCorrect: null,
      lastResolution: null,
      lastClickedCountryName: null,
      floatingLabels: [],
    });
  },

  resetGame: () => {
    set({
      phase: "idle",
      countryPool: [],
      currentCountry: null,
      triesRemaining: GAME_CONFIG.maxTries,
      wrongGuessIds: new Set(),
      isCorrect: null,
      lastResolution: null,
      lastClickedCountryName: null,
      floatingLabels: [],
      resolvedCountries: new Map(),
      questionsAnswered: 0,
      questionsCorrect: 0,
    });
  },
}));
