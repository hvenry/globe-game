/**
 * Head-to-head race rules as pure transition functions.
 *
 * Same contract as `solo.ts`: every function takes the current state (plus the
 * wall-clock time where it matters) and returns the next state without
 * mutating the input, returning the input unchanged for no-ops.
 *
 * The race is driven by player intents (`guess`, `leave`, `rejoin`) and by the
 * wall clock (`tick`). Every phase that ends on its own exposes that moment as
 * `phaseDeadline`, so an authoritative server needs one timer per room: sleep
 * until `nextTransitionAt`, then call `tick`. `guess` settles any due
 * deadlines itself before applying the click, so a late guess is always judged
 * against the state as of `now`.
 *
 * No browser, React, or store imports — this module runs on the server too.
 */

import type { RaceConfig, RacePlayer, RaceState } from "./types";
import { seededShuffle } from "./rng";

export interface RacePlayerInput {
  id: string;
  name: string;
  color: string;
}

export function createRace(
  countryIds: readonly string[],
  config: RaceConfig,
  seed: number,
  players: readonly RacePlayerInput[],
  startsAt: number,
): RaceState {
  const count = Math.max(0, Math.min(config.countryCount, countryIds.length));
  const order = seededShuffle(countryIds, seed).slice(0, count);
  return {
    phase: "countdown",
    config,
    seed,
    order,
    currentIndex: -1,
    currentId: null,
    shownAt: null,
    phaseDeadline: startsAt,
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      connected: true,
      lockedUntil: null,
      attemptIds: [],
      claims: 0,
      totalClaimMs: 0,
    })),
    results: {},
    startsAt,
    endedAt: null,
  };
}

/** Epoch ms of the next self-driven phase change, or null once finished. */
export function nextTransitionAt(state: RaceState): number | null {
  return state.phaseDeadline;
}

/** Milliseconds until the current phase ends on its own; null once finished. */
export function timeRemainingMs(state: RaceState, now: number): number | null {
  if (state.phaseDeadline === null) return null;
  return Math.max(0, state.phaseDeadline - now);
}

function finish(state: RaceState, now: number): RaceState {
  return { ...state, phase: "finished", phaseDeadline: null, endedAt: now };
}

/** Reveal the next country, or finish when the order is exhausted. */
function showNext(state: RaceState, now: number): RaceState {
  const currentIndex = state.currentIndex + 1;
  if (currentIndex >= state.order.length) return finish(state, now);
  return {
    ...state,
    phase: "racing",
    currentIndex,
    currentId: state.order[currentIndex],
    shownAt: now,
    phaseDeadline: now + state.config.countryWindowMs,
    // Misses belong to the country they were made against.
    players: state.players.map((p) =>
      p.attemptIds.length === 0 ? p : { ...p, attemptIds: [] },
    ),
  };
}

/** Record the active country's outcome and enter intermission. */
function resolveCurrent(
  state: RaceState,
  by: string | null,
  elapsedMs: number | null,
  now: number,
): RaceState {
  const currentId = state.currentId;
  if (!currentId) return state;
  return {
    ...state,
    phase: "intermission",
    results: { ...state.results, [currentId]: { by, elapsedMs } },
    phaseDeadline: now + state.config.intermissionMs,
  };
}

function updatePlayer(
  state: RaceState,
  index: number,
  patch: Partial<RacePlayer>,
): RacePlayer[] {
  return state.players.map((p, i) => (i === index ? { ...p, ...patch } : p));
}

/**
 * Apply every deadline that has passed. Each step uses the real `now`, so a
 * server that oversleeps resolves the missed country and re-times the next
 * phase from the present rather than cascading through the schedule.
 */
export function tick(state: RaceState, now: number): RaceState {
  let s = state;
  while (s.phaseDeadline !== null && now >= s.phaseDeadline) {
    if (s.phase === "racing") {
      s = resolveCurrent(s, null, null, now);
    } else if (s.phase === "countdown" || s.phase === "intermission") {
      s = showNext(s, now);
    } else {
      break;
    }
  }
  return s;
}

/**
 * A player clicks a country. Only the active country during `racing` can be
 * claimed; a wrong click locks the player out for `lockoutMs`. Clicks that
 * change nothing (wrong phase, unknown or departed player, locked out,
 * already-resolved country) return the state unchanged.
 */
export function guess(
  state: RaceState,
  playerId: string,
  countryId: string,
  now: number,
): RaceState {
  const s = tick(state, now);
  if (s.phase !== "racing" || s.currentId === null) return s;

  const index = s.players.findIndex((p) => p.id === playerId);
  if (index === -1) return s;
  const player = s.players[index];
  if (!player.connected) return s;
  if (player.lockedUntil !== null && player.lockedUntil > now) return s;
  // Free click: a country that has already been claimed or expired.
  if (s.results[countryId]) return s;

  if (countryId === s.currentId) {
    const elapsedMs = Math.max(0, now - (s.shownAt ?? now));
    return resolveCurrent(
      {
        ...s,
        players: updatePlayer(s, index, {
          claims: player.claims + 1,
          totalClaimMs: player.totalClaimMs + elapsedMs,
        }),
      },
      playerId,
      elapsedMs,
      now,
    );
  }

  return {
    ...s,
    players: updatePlayer(s, index, {
      lockedUntil: now + s.config.lockoutMs,
      attemptIds: player.attemptIds.includes(countryId)
        ? player.attemptIds
        : [...player.attemptIds, countryId],
    }),
  };
}

/**
 * A player disconnects. Their claims stand but they can no longer claim. The
 * race finishes at once if nobody is left connected.
 */
export function leave(state: RaceState, playerId: string, now: number): RaceState {
  if (state.phase === "finished") return state;
  const index = state.players.findIndex((p) => p.id === playerId);
  if (index === -1 || !state.players[index].connected) return state;

  const players = updatePlayer(state, index, { connected: false });
  const next = { ...state, players };
  return players.some((p) => p.connected) ? next : finish(next, now);
}

/** A departed player reconnects. No-op once the race has finished. */
export function rejoin(state: RaceState, playerId: string): RaceState {
  if (state.phase === "finished") return state;
  const index = state.players.findIndex((p) => p.id === playerId);
  if (index === -1 || state.players[index].connected) return state;
  return { ...state, players: updatePlayer(state, index, { connected: true }) };
}

/**
 * Players ordered by claims (desc), then total claim time (asc), then id so
 * the order is deterministic. Position 0 leads; a draw is two players equal
 * on both claims and time. The engine does not declare a winner.
 */
export function standings(state: RaceState): RacePlayer[] {
  return [...state.players].sort(
    (a, b) =>
      b.claims - a.claims ||
      a.totalClaimMs - b.totalClaimMs ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}
