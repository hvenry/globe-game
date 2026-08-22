/**
 * Core game engine types.
 *
 * Everything in this module is intentionally serializable (plain objects and
 * arrays, no Map/Set/Date) and free of browser/React dependencies, so the same
 * engine can run in the browser (solo play, optimistic prediction) and on an
 * authoritative game server (multiplayer race rooms).
 */

export type Resolution = "perfect" | "almost" | "failed";

export type SoloPhase = "playing" | "feedback" | "mustclick" | "gameover";

export interface SoloConfig {
  countrySetId: string;
  expertMode: boolean;
  /** Countdown per country in milliseconds, or null when the timer is off. */
  timerLimitMs: number | null;
  maxTries: number;
}

/** Progress stashed for a country the player skipped away from. */
export interface PerCountryProgress {
  triesRemaining: number;
  wrongGuessIds: string[];
  /** Time left on that country's countdown when it was stashed. */
  timeLeftMs: number | null;
}

export interface SoloState {
  phase: SoloPhase;
  config: SoloConfig;
  /** RNG seed used to shuffle `order` — kept for replays and shared races. */
  seed: number;
  /** Full play order, fixed at game creation. */
  order: string[];
  /** Ids not yet resolved, preserving `order`'s relative ordering. */
  unanswered: string[];
  /** Index of the active question within `unanswered`. */
  currentIndex: number;
  currentId: string | null;
  triesRemaining: number;
  /** Wrong guesses for the active question. */
  wrongGuessIds: string[];
  /** Stashed progress for countries the player skipped away from. */
  saved: Record<string, PerCountryProgress>;
  resolved: Record<string, Resolution>;
  questionsAnswered: number;
  questionsCorrect: number;
  totalPoints: number;
  isCorrect: boolean | null;
  lastResolution: Resolution | null;
  lastClickedId: string | null;
  /** Epoch ms when the active countdown expires; null when no timer runs. */
  timerDeadline: number | null;
  /** Epoch ms when the game started. */
  startedAt: number;
  /** Epoch ms when the game ended (phase became gameover); null while running. */
  endedAt: number | null;
  /** Epoch ms when the game was paused; null while running. */
  pausedAt: number | null;
  totalPausedMs: number;
}
