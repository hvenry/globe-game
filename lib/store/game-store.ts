import { create } from "zustand";
import type { CountryData } from "@/lib/geo/types";
import type { CountrySetId } from "@/lib/geo/country-sets";
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
  countrySetId: CountrySetId; // Track which country set is being played
  validCountryIds: Set<string>;
  maxTries: number; // Maximum attempts per country

  resolvedCountries: Map<string, Resolution>;
  questionsAnswered: number;
  questionsCorrect: number;

  // Timer state
  countdownRemaining: number;
  countdownTimerLimit: number | null;
  gameStartTime: number | null;
  gamePausedAt: number | null;
  totalPausedTime: number;
  countryCountdowns: Map<string, number>;

  startGame: (countries: CountryData[], countrySetId: CountrySetId, expertMode?: boolean, timerLimit?: number | null, maxTries?: number) => void;
  makeGuess: (countryId: string) => void;
  addFloatingLabel: (name: string, position: [number, number, number]) => void;
  removeFloatingLabel: (id: string) => void;
  goNext: () => void;
  goPrev: () => void;
  nextCountry: () => void;
  forfeitGame: () => void;
  resetGame: () => void;
  setCountdownRemaining: (time: number) => void;
  handleTimerExpired: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
}

function saveCurrentTriesState(state: GameState): {
  countryTries: Map<string, number>;
  countryWrongGuesses: Map<string, Set<string>>;
  countryCountdowns: Map<string, number>;
} {
  if (!state.currentCountry) {
    return {
      countryTries: state.countryTries,
      countryWrongGuesses: state.countryWrongGuesses,
      countryCountdowns: state.countryCountdowns,
    };
  }
  const newTries = new Map(state.countryTries);
  newTries.set(state.currentCountry.id, state.triesRemaining);
  const newWrong = new Map(state.countryWrongGuesses);
  newWrong.set(state.currentCountry.id, new Set(state.wrongGuessIds));
  const newCountdowns = new Map(state.countryCountdowns);
  newCountdowns.set(state.currentCountry.id, state.countdownRemaining);
  return { countryTries: newTries, countryWrongGuesses: newWrong, countryCountdowns: newCountdowns };
}

function loadTriesState(
  country: CountryData,
  countryTries: Map<string, number>,
  countryWrongGuesses: Map<string, Set<string>>,
  countryCountdowns: Map<string, number>,
  timerLimit: number | null,
  maxTries: number
) {
  return {
    triesRemaining: countryTries.get(country.id) ?? maxTries,
    wrongGuessIds: countryWrongGuesses.get(country.id) ?? new Set<string>(),
    countdownRemaining: countryCountdowns.get(country.id) ?? (timerLimit ?? 0),
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
  countrySetId: "all",
  validCountryIds: new Set(),
  maxTries: GAME_CONFIG.maxTries,

  resolvedCountries: new Map(),
  questionsAnswered: 0,
  questionsCorrect: 0,

  // Timer state
  countdownRemaining: 0,
  countdownTimerLimit: null,
  gameStartTime: null,
  gamePausedAt: null,
  totalPausedTime: 0,
  countryCountdowns: new Map(),

  startGame: (countries, countrySetId, expertMode = false, timerLimit = null, maxTries = GAME_CONFIG.maxTries) => {
    const shuffled = shuffle(countries);
    const tries = new Map<string, number>();
    const wrongGuesses = new Map<string, Set<string>>();
    const countdowns = new Map<string, number>();
    for (const c of shuffled) {
      tries.set(c.id, maxTries);
      wrongGuesses.set(c.id, new Set());
      countdowns.set(c.id, timerLimit ?? 0);
    }
    set({
      phase: "playing",
      unansweredCountries: shuffled,
      currentIndex: 0,
      currentCountry: shuffled[0],
      countryTries: tries,
      countryWrongGuesses: wrongGuesses,
      countryCountdowns: countdowns,
      totalCountries: shuffled.length,
      triesRemaining: maxTries,
      wrongGuessIds: new Set(),
      isCorrect: null,
      lastResolution: null,
      lastClickedCountryName: null,
      floatingLabels: [],
      expertMode,
      countrySetId,
      validCountryIds: new Set(shuffled.map(c => c.id)),
      maxTries,
      resolvedCountries: new Map(),
      questionsAnswered: 0,
      questionsCorrect: 0,
      countdownRemaining: timerLimit ?? 0,
      countdownTimerLimit: timerLimit,
      gameStartTime: Date.now(),
      gamePausedAt: null,
      totalPausedTime: 0,
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
    const loaded = loadTriesState(
      nextCountry,
      saved.countryTries,
      saved.countryWrongGuesses,
      saved.countryCountdowns,
      state.countdownTimerLimit,
      state.maxTries
    );
    set({
      ...saved,
      currentIndex: newIndex,
      currentCountry: nextCountry,
      triesRemaining: loaded.triesRemaining,
      wrongGuessIds: loaded.wrongGuessIds,
      countdownRemaining: loaded.countdownRemaining,
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
    const loaded = loadTriesState(
      prevCountry,
      saved.countryTries,
      saved.countryWrongGuesses,
      saved.countryCountdowns,
      state.countdownTimerLimit,
      state.maxTries
    );
    set({
      ...saved,
      currentIndex: newIndex,
      currentCountry: prevCountry,
      triesRemaining: loaded.triesRemaining,
      wrongGuessIds: loaded.wrongGuessIds,
      countdownRemaining: loaded.countdownRemaining,
      isCorrect: null,
      lastClickedCountryName: null,
      floatingLabels: [],
    });
  },

  makeGuess: (countryId) => {
    const state = get();
    if (state.phase !== "playing" || !state.currentCountry) return;

    const guessBase = baseId(countryId);

    // Ignore clicks on countries outside the active game set
    if (!state.validCountryIds.has(guessBase)) return;

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
        state.triesRemaining === state.maxTries ? "perfect" : "imperfect";
      const newResolved = new Map(state.resolvedCountries);
      newResolved.set(state.currentCountry.id, resolution);

      // Remove country from unanswered list
      const newUnanswered = state.unansweredCountries.filter((_, i) => i !== state.currentIndex);
      const newTries = new Map(state.countryTries);
      newTries.delete(state.currentCountry.id);
      const newWrong = new Map(state.countryWrongGuesses);
      newWrong.delete(state.currentCountry.id);
      const newCountdowns = new Map(state.countryCountdowns);
      newCountdowns.delete(state.currentCountry.id);
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
        countryCountdowns: newCountdowns,
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
        const newCountdowns = new Map(state.countryCountdowns);
        newCountdowns.delete(state.currentCountry.id);
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
          countryCountdowns: newCountdowns,
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
    const idx = Math.min(state.currentIndex, state.unansweredCountries.length - 1);
    const country = state.unansweredCountries[idx];
    const loaded = loadTriesState(
      country,
      state.countryTries,
      state.countryWrongGuesses,
      state.countryCountdowns,
      state.countdownTimerLimit,
      state.maxTries
    );
    set({
      phase: "playing",
      currentIndex: idx,
      currentCountry: country,
      triesRemaining: loaded.triesRemaining,
      wrongGuessIds: loaded.wrongGuessIds,
      countdownRemaining: loaded.countdownRemaining,
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
      countryCountdowns: new Map(),
      totalCountries: 0,
      triesRemaining: GAME_CONFIG.maxTries,
      wrongGuessIds: new Set(),
      isCorrect: null,
      lastResolution: null,
      lastClickedCountryName: null,
      floatingLabels: [],
      expertMode: false,
      countrySetId: "all",
      validCountryIds: new Set(),
      maxTries: GAME_CONFIG.maxTries,
      resolvedCountries: new Map(),
      questionsAnswered: 0,
      questionsCorrect: 0,
      countdownRemaining: 0,
      countdownTimerLimit: null,
      gameStartTime: null,
      gamePausedAt: null,
      totalPausedTime: 0,
    });
  },

  setCountdownRemaining: (time) => {
    set({ countdownRemaining: time });
  },

  handleTimerExpired: () => {
    const state = get();
    if (state.phase !== "playing" || !state.currentCountry) return;

    const newResolved = new Map(state.resolvedCountries);
    newResolved.set(state.currentCountry.id, "failed");

    // Expert mode: time expired = game over
    if (state.expertMode) {
      set({
        phase: "gameover",
        isCorrect: false,
        triesRemaining: 0,
        countdownRemaining: 0,
        lastResolution: "failed",
        lastClickedCountryName: "Time's up!",
        resolvedCountries: newResolved,
        questionsAnswered: state.questionsAnswered + 1,
      });
      return;
    }

    // Normal mode: remove country from unanswered list and continue
    const newUnanswered = state.unansweredCountries.filter((_, i) => i !== state.currentIndex);
    const newTries = new Map(state.countryTries);
    newTries.delete(state.currentCountry.id);
    const newWrong = new Map(state.countryWrongGuesses);
    newWrong.delete(state.currentCountry.id);
    const newCountdowns = new Map(state.countryCountdowns);
    newCountdowns.delete(state.currentCountry.id);
    const newIndex = newUnanswered.length === 0 ? 0 : state.currentIndex >= newUnanswered.length ? 0 : state.currentIndex;

    set({
      phase: "feedback",
      isCorrect: false,
      triesRemaining: 0,
      countdownRemaining: 0,
      lastResolution: "failed",
      lastClickedCountryName: "Time's up!",
      resolvedCountries: newResolved,
      questionsAnswered: state.questionsAnswered + 1,
      unansweredCountries: newUnanswered,
      currentIndex: newIndex,
      countryTries: newTries,
      countryWrongGuesses: newWrong,
      countryCountdowns: newCountdowns,
    });
  },

  pauseTimer: () => {
    const state = get();
    if (state.gamePausedAt === null) {
      set({ gamePausedAt: Date.now() });
    }
  },

  resumeTimer: () => {
    const state = get();
    if (state.gamePausedAt !== null) {
      const pauseDuration = Date.now() - state.gamePausedAt;
      set({
        totalPausedTime: state.totalPausedTime + pauseDuration,
        gamePausedAt: null,
      });
    }
  },
}));
