import { create } from "zustand";
import type { CountryData } from "@/lib/geo/types";
import type { CountrySetId } from "@/lib/geo/country-sets";
import type { Resolution, SoloState } from "@/lib/engine/types";
import * as solo from "@/lib/engine/solo";
import { randomSeed } from "@/lib/engine/rng";
import { GAME_CONFIG } from "@/lib/constants";

export type { Resolution } from "@/lib/engine/types";
export type GamePhase = "idle" | "playing" | "feedback" | "gameover" | "mustclick";

export interface FloatingLabel {
  id: string;
  name: string;
  position: [number, number, number]; // 3D position on globe
  createdAt: number;
}

export interface StartGameConfig {
  countrySetId: CountrySetId;
  expertMode: boolean;
  /** Seconds per country, or null for no timer. */
  timerLimit: number | null;
  maxTries: number;
}

/**
 * Thin client adapter around the pure game engine (`lib/engine`).
 *
 * All rules live in the engine as pure functions; this store holds the engine
 * state, mirrors it into the flat fields the UI reads, and owns UI-only
 * concerns (floating labels, country metadata lookups). In multiplayer, an
 * equivalent adapter applies server-authoritative engine states instead.
 */
interface GameState {
  phase: GamePhase;
  engine: SoloState | null;

  // Mirrored engine state (kept flat for cheap component selectors)
  currentCountry: CountryData | null;
  triesRemaining: number;
  maxTries: number;
  wrongGuessIds: string[];
  resolvedCountries: Record<string, Resolution>;
  questionsAnswered: number;
  questionsCorrect: number;
  totalPoints: number;
  totalCountries: number;
  /**
   * 1-based position of the active country in the run's fixed play order, or
   * 0 when idle. Distinct from `questionsAnswered`: skipping moves through the
   * sequence without answering anything, so the two diverge as soon as the
   * player navigates.
   */
  currentPosition: number;
  unansweredCount: number;
  expertMode: boolean;
  countrySetId: CountrySetId;
  isCorrect: boolean | null;
  lastResolution: Resolution | null;
  lastClickedCountryId: string | null;
  lastClickedCountryName: string | null;
  /** Epoch ms when the active countdown expires; null when no timer runs. */
  timerDeadline: number | null;
  /** Countdown limit in seconds (for the timer dial), null when disabled. */
  countdownTimerLimit: number | null;
  gameStartTime: number | null;
  gameEndedAt: number | null;
  gamePausedAt: number | null;
  totalPausedTime: number;

  // Game-set lookups (fixed per game)
  validCountryIds: Set<string>;
  countriesById: Record<string, CountryData>;

  // UI-only state
  floatingLabels: FloatingLabel[];

  startGame: (countries: CountryData[], config: StartGameConfig, seed?: number) => void;
  makeGuess: (countryId: string) => void;
  goNext: () => void;
  goPrev: () => void;
  nextCountry: () => void;
  handleTimerExpired: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  forfeitGame: () => void;
  resetGame: () => void;
  addFloatingLabel: (name: string, position: [number, number, number]) => void;
  removeFloatingLabel: (id: string) => void;
}

const IDLE_MIRROR = {
  phase: "idle" as GamePhase,
  engine: null,
  currentCountry: null,
  triesRemaining: GAME_CONFIG.maxTries,
  maxTries: GAME_CONFIG.maxTries,
  wrongGuessIds: [] as string[],
  resolvedCountries: {} as Record<string, Resolution>,
  questionsAnswered: 0,
  questionsCorrect: 0,
  totalPoints: 0,
  totalCountries: 0,
  currentPosition: 0,
  unansweredCount: 0,
  expertMode: false,
  countrySetId: "all" as CountrySetId,
  isCorrect: null,
  lastResolution: null,
  lastClickedCountryId: null,
  lastClickedCountryName: null,
  timerDeadline: null,
  countdownTimerLimit: null,
  gameStartTime: null,
  gameEndedAt: null,
  gamePausedAt: null,
  totalPausedTime: 0,
  validCountryIds: new Set<string>(),
  countriesById: {} as Record<string, CountryData>,
  floatingLabels: [] as FloatingLabel[],
};

/** Flatten an engine state into the fields components subscribe to. */
function mirror(
  engine: SoloState,
  countriesById: Record<string, CountryData>,
): Partial<GameState> {
  return {
    engine,
    phase: engine.phase,
    currentCountry: engine.currentId ? (countriesById[engine.currentId] ?? null) : null,
    triesRemaining: engine.triesRemaining,
    maxTries: engine.config.maxTries,
    wrongGuessIds: engine.wrongGuessIds,
    resolvedCountries: engine.resolved,
    questionsAnswered: engine.questionsAnswered,
    questionsCorrect: engine.questionsCorrect,
    totalPoints: engine.totalPoints,
    totalCountries: engine.order.length,
    currentPosition: engine.currentId
      ? engine.order.indexOf(engine.currentId) + 1
      : 0,
    unansweredCount: engine.unanswered.length,
    expertMode: engine.config.expertMode,
    countrySetId: engine.config.countrySetId as CountrySetId,
    isCorrect: engine.isCorrect,
    lastResolution: engine.lastResolution,
    lastClickedCountryId: engine.lastClickedId,
    lastClickedCountryName: engine.lastClickedId
      ? (countriesById[engine.lastClickedId]?.name ?? "Unknown")
      : null,
    timerDeadline: engine.timerDeadline,
    countdownTimerLimit:
      engine.config.timerLimitMs !== null ? engine.config.timerLimitMs / 1000 : null,
    gameStartTime: engine.startedAt,
    gameEndedAt: engine.endedAt,
    gamePausedAt: engine.pausedAt,
    totalPausedTime: engine.totalPausedMs,
  };
}

export const useGameStore = create<GameState>((set, get) => {
  /** Apply an engine transition; no-ops (same reference) leave the store untouched. */
  function apply(transition: (engine: SoloState, now: number) => SoloState) {
    const { engine, countriesById } = get();
    if (!engine) return;
    const next = transition(engine, Date.now());
    if (next === engine) return;
    set({
      ...mirror(next, countriesById),
      // Drop floating labels whenever the question changes
      ...(next.currentId !== engine.currentId ? { floatingLabels: [] } : null),
    });
  }

  return {
    ...IDLE_MIRROR,

    startGame: (countries, config, seed) => {
      const countriesById: Record<string, CountryData> = {};
      for (const c of countries) countriesById[c.id] = c;

      const engine = solo.createSoloGame(
        countries.map((c) => c.id),
        {
          countrySetId: config.countrySetId,
          expertMode: config.expertMode,
          timerLimitMs: config.timerLimit !== null ? config.timerLimit * 1000 : null,
          maxTries: config.maxTries,
        },
        seed ?? randomSeed(),
        Date.now(),
      );

      set({
        ...IDLE_MIRROR,
        ...mirror(engine, countriesById),
        countriesById,
        validCountryIds: new Set(countries.map((c) => c.id)),
      });
    },

    makeGuess: (countryId) => apply((e, now) => solo.guess(e, countryId, now)),
    goNext: () => apply((e, now) => solo.skip(e, 1, now)),
    goPrev: () => apply((e, now) => solo.skip(e, -1, now)),
    nextCountry: () => apply(solo.advance),
    handleTimerExpired: () => apply(solo.expireTimer),
    pauseTimer: () => apply(solo.pause),
    resumeTimer: () => apply(solo.resume),
    forfeitGame: () => apply((e, now) => solo.forfeit(e, now)),

    resetGame: () => set({ ...IDLE_MIRROR }),

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
  };
});
