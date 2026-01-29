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
  unansweredCountries: CountryData[];
  currentIndex: number;
  currentCountry: CountryData | null;
  countryTries: Map<string, number>;
  countryWrongGuesses: Map<string, Set<string>>;
  totalCountries: number;
  triesRemaining: number;
  wrongGuessIds: Set<string>;
  isCorrect: boolean | null;
  lastResolution: Resolution | null;
  lastClickedCountryName: string | null;
  floatingLabels: FloatingLabel[];
  expertMode: boolean;

  resolvedCountries: Map<string, Resolution>;
  questionsAnswered: number;
  questionsCorrect: number;

  startGame: (countries: CountryData[], expertMode?: boolean) => void;
  makeGuess: (countryId: string) => void;
  addFloatingLabel: (name: string, position: [number, number, number]) => void;
  removeFloatingLabel: (id: string) => void;
  goNext: () => void;
  goPrev: () => void;
  nextCountry: () => void;
  forfeitGame: () => void;
  resetGame: () => void;
}

function saveCurrentTriesState(state: GameState): { countryTries: Map<string, number>; countryWrongGuesses: Map<string, Set<string>> } {
  if (!state.currentCountry) return { countryTries: state.countryTries, countryWrongGuesses: state.countryWrongGuesses };
  const newTries = new Map(state.countryTries);
  newTries.set(state.currentCountry.id, state.triesRemaining);
  const newWrong = new Map(state.countryWrongGuesses);
  newWrong.set(state.currentCountry.id, new Set(state.wrongGuessIds));
  return { countryTries: newTries, countryWrongGuesses: newWrong };
}

function loadTriesState(country: CountryData, countryTries: Map<string, number>, countryWrongGuesses: Map<string, Set<string>>) {
  return {
    triesRemaining: countryTries.get(country.id) ?? GAME_CONFIG.maxTries,
    wrongGuessIds: countryWrongGuesses.get(country.id) ?? new Set<string>(),
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: "idle",
  unansweredCountries: [],
  currentIndex: 0,
  currentCountry: null,
  countryTries: new Map(),
  countryWrongGuesses: new Map(),
  totalCountries: 0,
  triesRemaining: GAME_CONFIG.maxTries,
  wrongGuessIds: new Set(),
  isCorrect: null,
  lastResolution: null,
  lastClickedCountryName: null,
  floatingLabels: [],
  expertMode: false,

  resolvedCountries: new Map(),
  questionsAnswered: 0,
  questionsCorrect: 0,

  startGame: (countries, expertMode = false) => {
    const shuffled = shuffle(countries);
    const tries = new Map<string, number>();
    const wrongGuesses = new Map<string, Set<string>>();
    for (const c of shuffled) {
      tries.set(c.id, GAME_CONFIG.maxTries);
      wrongGuesses.set(c.id, new Set());
    }
    set({
      phase: "playing",
      unansweredCountries: shuffled,
      currentIndex: 0,
      currentCountry: shuffled[0],
      countryTries: tries,
      countryWrongGuesses: wrongGuesses,
      totalCountries: shuffled.length,
      triesRemaining: GAME_CONFIG.maxTries,
      wrongGuessIds: new Set(),
      isCorrect: null,
      lastResolution: null,
      lastClickedCountryName: null,
      floatingLabels: [],
      expertMode,
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

  goNext: () => {
    const state = get();
    if (state.phase !== "playing" || state.unansweredCountries.length <= 1) return;
    const saved = saveCurrentTriesState(state);
    const newIndex = (state.currentIndex + 1) % state.unansweredCountries.length;
    const nextCountry = state.unansweredCountries[newIndex];
    const loaded = loadTriesState(nextCountry, saved.countryTries, saved.countryWrongGuesses);
    set({
      ...saved,
      currentIndex: newIndex,
      currentCountry: nextCountry,
      triesRemaining: loaded.triesRemaining,
      wrongGuessIds: loaded.wrongGuessIds,
      isCorrect: null,
      lastClickedCountryName: null,
      floatingLabels: [],
    });
  },

  goPrev: () => {
    const state = get();
    if (state.phase !== "playing" || state.unansweredCountries.length <= 1) return;
    const saved = saveCurrentTriesState(state);
    const len = state.unansweredCountries.length;
    const newIndex = (state.currentIndex - 1 + len) % len;
    const prevCountry = state.unansweredCountries[newIndex];
    const loaded = loadTriesState(prevCountry, saved.countryTries, saved.countryWrongGuesses);
    set({
      ...saved,
      currentIndex: newIndex,
      currentCountry: prevCountry,
      triesRemaining: loaded.triesRemaining,
      wrongGuessIds: loaded.wrongGuessIds,
      isCorrect: null,
      lastClickedCountryName: null,
      floatingLabels: [],
    });
  },

  makeGuess: (countryId) => {
    const state = get();
    if (state.phase !== "playing" || !state.currentCountry) return;

    const guessBase = baseId(countryId);
    const isCorrect = guessBase === state.currentCountry.id;

    // Check if this country has already been resolved (correctly guessed in a previous question)
    if (state.resolvedCountries.has(guessBase)) {
      // Don't penalize for clicking an already-resolved country
      return;
    }

    // Check if this country has already been incorrectly guessed for the current question
    if (state.wrongGuessIds.has(guessBase)) {
      // Don't penalize for re-clicking an already-wrong guess (allows reviewing)
      return;
    }

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

      // Remove country from unanswered list
      const newUnanswered = state.unansweredCountries.filter((_, i) => i !== state.currentIndex);
      const newTries = new Map(state.countryTries);
      newTries.delete(state.currentCountry.id);
      const newWrong = new Map(state.countryWrongGuesses);
      newWrong.delete(state.currentCountry.id);
      const newIndex = newUnanswered.length === 0 ? 0 : state.currentIndex >= newUnanswered.length ? 0 : state.currentIndex;

      set({
        phase: "feedback",
        isCorrect: true,
        lastResolution: resolution,
        lastClickedCountryName: null,
        resolvedCountries: newResolved,
        questionsAnswered: state.questionsAnswered + 1,
        questionsCorrect: state.questionsCorrect + 1,
        unansweredCountries: newUnanswered,
        currentIndex: newIndex,
        countryTries: newTries,
        countryWrongGuesses: newWrong,
      });
    } else {
      // Expert mode: one wrong click = game over
      if (state.expertMode) {
        const newResolved = new Map(state.resolvedCountries);
        newResolved.set(state.currentCountry.id, "failed");
        const newWrongIds = new Set(state.wrongGuessIds);
        newWrongIds.add(guessBase);

        set({
          phase: "gameover",
          isCorrect: false,
          triesRemaining: 0,
          wrongGuessIds: newWrongIds,
          lastResolution: "failed",
          lastClickedCountryName: guessedCountryName,
          resolvedCountries: newResolved,
          questionsAnswered: state.questionsAnswered + 1,
        });
        return;
      }

      const newTries = state.triesRemaining - 1;
      const newWrongIds = new Set(state.wrongGuessIds);
      newWrongIds.add(guessBase);

      if (newTries === 0) {
        const newResolved = new Map(state.resolvedCountries);
        newResolved.set(state.currentCountry.id, "failed");

        // Remove country from unanswered list
        const newUnanswered = state.unansweredCountries.filter((_, i) => i !== state.currentIndex);
        const newTriesMap = new Map(state.countryTries);
        newTriesMap.delete(state.currentCountry.id);
        const newWrong = new Map(state.countryWrongGuesses);
        newWrong.delete(state.currentCountry.id);
        const newIndex = newUnanswered.length === 0 ? 0 : state.currentIndex >= newUnanswered.length ? 0 : state.currentIndex;

        set({
          phase: "feedback",
          isCorrect: false,
          triesRemaining: 0,
          wrongGuessIds: newWrongIds,
          lastResolution: "failed",
          lastClickedCountryName: guessedCountryName,
          resolvedCountries: newResolved,
          questionsAnswered: state.questionsAnswered + 1,
          unansweredCountries: newUnanswered,
          currentIndex: newIndex,
          countryTries: newTriesMap,
          countryWrongGuesses: newWrong,
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
    if (state.unansweredCountries.length === 0) {
      set({ phase: "gameover" });
      return;
    }
    const country = state.unansweredCountries[state.currentIndex];
    const loaded = loadTriesState(country, state.countryTries, state.countryWrongGuesses);
    set({
      phase: "playing",
      currentCountry: country,
      triesRemaining: loaded.triesRemaining,
      wrongGuessIds: loaded.wrongGuessIds,
      isCorrect: null,
      lastResolution: null,
      lastClickedCountryName: null,
      floatingLabels: [],
    });
  },

  forfeitGame: () => {
    set({ phase: "gameover" });
  },

  resetGame: () => {
    set({
      phase: "idle",
      unansweredCountries: [],
      currentIndex: 0,
      currentCountry: null,
      countryTries: new Map(),
      countryWrongGuesses: new Map(),
      totalCountries: 0,
      triesRemaining: GAME_CONFIG.maxTries,
      wrongGuessIds: new Set(),
      isCorrect: null,
      lastResolution: null,
      lastClickedCountryName: null,
      floatingLabels: [],
      expertMode: false,
      resolvedCountries: new Map(),
      questionsAnswered: 0,
      questionsCorrect: 0,
    });
  },
}));
