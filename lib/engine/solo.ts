/**
 * Solo game rules as pure transition functions.
 *
 * Every function takes the current state (plus the wall-clock time where it
 * matters) and returns the next state without mutating the input. Functions
 * return the input state unchanged when the action is a no-op, so callers can
 * cheaply detect "nothing happened" by reference equality.
 *
 * No browser, React, or store imports — this module must stay portable to the
 * multiplayer server.
 */

import type { PerCountryProgress, Resolution, SoloConfig, SoloState } from "./types";
import { seededShuffle } from "./rng";

export function createSoloGame(
  countryIds: readonly string[],
  config: SoloConfig,
  seed: number,
  now: number,
): SoloState {
  const order = seededShuffle(countryIds, seed);
  return {
    phase: "playing",
    config,
    seed,
    order,
    unanswered: order,
    currentIndex: 0,
    currentId: order[0] ?? null,
    triesRemaining: config.maxTries,
    wrongGuessIds: [],
    saved: {},
    resolved: {},
    questionsAnswered: 0,
    questionsCorrect: 0,
    totalPoints: 0,
    isCorrect: null,
    lastResolution: null,
    lastClickedId: null,
    timerDeadline: config.timerLimitMs !== null ? now + config.timerLimitMs : null,
    startedAt: now,
    endedAt: null,
    pausedAt: null,
    totalPausedMs: 0,
  };
}

/** Milliseconds left on the active countdown (freezes while paused). */
export function timeRemainingMs(state: SoloState, now: number): number | null {
  if (state.timerDeadline === null) return null;
  const effectiveNow = state.pausedAt ?? now;
  return Math.max(0, state.timerDeadline - effectiveNow);
}

/** Milliseconds of active play, excluding paused time. */
export function elapsedMs(state: SoloState, now: number): number {
  const effectiveNow = state.pausedAt ?? now;
  return Math.max(0, effectiveNow - state.startedAt - state.totalPausedMs);
}

function loadProgress(
  state: SoloState,
  id: string,
  now: number,
): Pick<SoloState, "triesRemaining" | "wrongGuessIds" | "timerDeadline"> {
  const saved: PerCountryProgress | undefined = state.saved[id];
  const timeLeftMs = saved?.timeLeftMs ?? state.config.timerLimitMs;
  return {
    triesRemaining: saved?.triesRemaining ?? state.config.maxTries,
    wrongGuessIds: saved?.wrongGuessIds ?? [],
    timerDeadline: timeLeftMs !== null ? now + timeLeftMs : null,
  };
}

/**
 * Resolve the active question and remove it from the unanswered pool.
 * Keeps `currentId` pointing at the resolved country (mustclick and the
 * feedback overlay still need it); `advance` moves to the next question.
 */
function resolveCurrent(
  state: SoloState,
  resolution: Resolution,
  points: number,
): SoloState {
  const currentId = state.currentId;
  if (!currentId) return state;

  const unanswered = state.unanswered.filter((id) => id !== currentId);
  const saved = { ...state.saved };
  delete saved[currentId];

  return {
    ...state,
    resolved: { ...state.resolved, [currentId]: resolution },
    unanswered,
    currentIndex: state.currentIndex >= unanswered.length ? 0 : state.currentIndex,
    saved,
    questionsAnswered: state.questionsAnswered + 1,
    questionsCorrect: state.questionsCorrect + (resolution === "failed" ? 0 : 1),
    totalPoints: state.totalPoints + points,
    lastResolution: resolution,
  };
}

export function guess(state: SoloState, guessId: string, now: number): SoloState {
  const currentId = state.currentId;
  if (!currentId) return state;

  // mustclick: the failed country is already resolved; the player just has to
  // find it before the game moves on. Wrong clicks are ignored.
  if (state.phase === "mustclick") {
    if (guessId !== currentId) return state;
    return advance(state, now);
  }

  if (state.phase !== "playing") return state;
  // Free clicks: already-resolved countries and repeated wrong guesses.
  if (state.resolved[guessId]) return state;
  if (state.wrongGuessIds.includes(guessId)) return state;

  if (guessId === currentId) {
    const resolution: Resolution =
      state.triesRemaining === state.config.maxTries ? "perfect" : "almost";
    const points = state.triesRemaining / state.config.maxTries;
    return {
      ...resolveCurrent(state, resolution, points),
      phase: "feedback",
      isCorrect: true,
      lastClickedId: null,
      timerDeadline: null,
    };
  }

  const wrongGuessIds = [...state.wrongGuessIds, guessId];

  if (state.config.expertMode) {
    return {
      ...resolveCurrent(state, "failed", 0),
      phase: "gameover",
      endedAt: now,
      isCorrect: false,
      triesRemaining: 0,
      wrongGuessIds,
      lastClickedId: guessId,
      timerDeadline: null,
    };
  }

  const triesRemaining = state.triesRemaining - 1;
  if (triesRemaining <= 0) {
    return {
      ...resolveCurrent(state, "failed", 0),
      phase: "mustclick",
      isCorrect: false,
      triesRemaining: 0,
      wrongGuessIds,
      lastClickedId: guessId,
      timerDeadline: null,
    };
  }

  return { ...state, triesRemaining, wrongGuessIds, lastClickedId: guessId };
}

export function expireTimer(state: SoloState, now: number): SoloState {
  if (state.phase !== "playing" || !state.currentId) return state;
  if (state.timerDeadline === null || state.pausedAt !== null) return state;
  if (state.timerDeadline > now) return state;

  const base = {
    ...resolveCurrent(state, "failed", 0),
    isCorrect: false,
    triesRemaining: 0,
    lastClickedId: null,
    timerDeadline: null,
  };
  return state.config.expertMode
    ? { ...base, phase: "gameover" as const, endedAt: now }
    : { ...base, phase: "mustclick" as const };
}

/** Move to the next unanswered question (after feedback or mustclick). */
export function advance(state: SoloState, now: number): SoloState {
  if (state.phase !== "feedback" && state.phase !== "mustclick") return state;

  if (state.unanswered.length === 0) {
    return { ...state, phase: "gameover", endedAt: now, timerDeadline: null };
  }

  const currentIndex = Math.min(state.currentIndex, state.unanswered.length - 1);
  const currentId = state.unanswered[currentIndex];
  return {
    ...state,
    ...loadProgress(state, currentId, now),
    phase: "playing",
    currentIndex,
    currentId,
    isCorrect: null,
    lastResolution: null,
    lastClickedId: null,
  };
}

/** Skip to the previous/next unanswered country, stashing current progress. */
export function skip(state: SoloState, direction: 1 | -1, now: number): SoloState {
  if (state.phase !== "playing" || state.unanswered.length <= 1) return state;
  const currentId = state.currentId;
  if (!currentId) return state;

  const remaining = timeRemainingMs(state, now);
  const saved: Record<string, PerCountryProgress> = {
    ...state.saved,
    [currentId]: {
      triesRemaining: state.triesRemaining,
      wrongGuessIds: state.wrongGuessIds,
      timeLeftMs: remaining,
    },
  };

  const len = state.unanswered.length;
  const currentIndex = (state.currentIndex + direction + len) % len;
  const nextId = state.unanswered[currentIndex];

  return {
    ...state,
    ...loadProgress({ ...state, saved }, nextId, now),
    saved,
    currentIndex,
    currentId: nextId,
    isCorrect: null,
    lastClickedId: null,
  };
}

export function pause(state: SoloState, now: number): SoloState {
  if (state.pausedAt !== null) return state;
  return { ...state, pausedAt: now };
}

export function resume(state: SoloState, now: number): SoloState {
  if (state.pausedAt === null) return state;
  const pausedFor = Math.max(0, now - state.pausedAt);
  return {
    ...state,
    pausedAt: null,
    totalPausedMs: state.totalPausedMs + pausedFor,
    timerDeadline:
      state.timerDeadline !== null ? state.timerDeadline + pausedFor : null,
  };
}

export function forfeit(state: SoloState, now: number): SoloState {
  if (state.phase === "gameover") return state;
  return { ...state, phase: "gameover", endedAt: now, timerDeadline: null };
}
