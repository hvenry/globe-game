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

// ---------------------------------------------------------------------------
// Race mode (head-to-head claim race on a shared seeded order)
// ---------------------------------------------------------------------------

export type RacePhase = "countdown" | "racing" | "intermission" | "finished";

export interface RaceConfig {
  countrySetId: string;
  /** Countries in play: the first N of the shuffled set, clamped to its size. */
  countryCount: number;
  /** Window per country before it resolves unclaimed. */
  countryWindowMs: number;
  /** Per-player lockout after a wrong click. */
  lockoutMs: number;
  /** Pause after a claim or expiry before the next country appears. */
  intermissionMs: number;
}

export interface RacePlayer {
  id: string;
  name: string;
  /** Identity colour id, assigned in the lobby; the client owns the hexes. */
  color: string;
  connected: boolean;
  /** Epoch ms until which this player's guesses are ignored; null when free. */
  lockedUntil: number | null;
  /**
   * Countries this player has wrongly clicked for the country showing now,
   * cleared when the next one appears. Shared rather than private: seeing
   * what an opponent has already ruled out is part of the race.
   */
  attemptIds: string[];
  /** The score: one point per claimed country. */
  claims: number;
  /** Tiebreak: sum of elapsed ms across this player's claims (lower wins). */
  totalClaimMs: number;
}

export interface RaceResult {
  /** Claiming player id, or null when the window expired unclaimed. */
  by: string | null;
  /** Ms from the country appearing to the claim; null when unclaimed. */
  elapsedMs: number | null;
}

export interface RaceState {
  phase: RacePhase;
  config: RaceConfig;
  /** RNG seed used to shuffle the country set — every client derives `order` from it. */
  seed: number;
  /** The countries in play, fixed at creation. */
  order: string[];
  /** Index into `order` of the active (or just-resolved) country; -1 during countdown. */
  currentIndex: number;
  /** Stays on the resolved country through intermission so clients can show the claim. */
  currentId: string | null;
  /** Epoch ms the current country appeared; null during countdown. */
  shownAt: number | null;
  /**
   * Epoch ms when the current phase ends on its own: `startsAt` in countdown,
   * the country window end while racing, the next reveal in intermission.
   * Null once finished. This is the only clock the server has to watch.
   */
  phaseDeadline: number | null;
  players: RacePlayer[];
  results: Record<string, RaceResult>;
  /** Epoch ms the first country appears. */
  startsAt: number;
  /** Epoch ms the race finished; null while running. */
  endedAt: number | null;
}
