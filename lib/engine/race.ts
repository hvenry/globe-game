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

import {
  RACE_EVENT_LOG,
  type RaceConfig,
  type RaceEvent,
  type RacePlayer,
  type RaceResult,
  type RaceState,
  type ScoreBreakdown,
} from "./types";
import { seededShuffle } from "./rng";
import { RACE_SCORING } from "../constants";

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
      recoveries: 0,
      score: 0,
      streak: 0,
      bestStreak: 0,
      totalClaimMs: 0,
    })),
    results: {},
    startsAt,
    endedAt: null,
    events: [],
    nextSeq: 0,
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

/** `Omit` over a union, applied to each member rather than their intersection. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

function log(
  state: RaceState,
  event: DistributiveOmit<RaceEvent, "seq">,
): RaceState {
  const entry = { ...event, seq: state.nextSeq } as RaceEvent;
  return {
    ...state,
    events: [...state.events, entry].slice(-RACE_EVENT_LOG),
    nextSeq: state.nextSeq + 1,
  };
}

/** Record the active country's outcome and enter intermission. */
function resolveCurrent(
  state: RaceState,
  by: string | null,
  elapsedMs: number | null,
  now: number,
  points?: number,
  recovered = false,
): RaceState {
  const currentId = state.currentId;
  if (!currentId) return state;
  const result: RaceResult = { by, elapsedMs };
  if (by !== null) {
    result.points = points;
    if (recovered) result.recovered = true;
  }
  return {
    ...state,
    phase: "intermission",
    results: { ...state.results, [currentId]: result },
    phaseDeadline: now + state.config.intermissionMs,
  };
}

/**
 * The window closed with nobody claiming. The country is revealed and waits
 * for a click — there is no deadline, so `phaseDeadline` goes null. Every
 * streak breaks here; nobody knew it.
 */
function reveal(state: RaceState, now: number): RaceState {
  const currentId = state.currentId;
  if (!currentId) return state;
  return log(
    {
      ...state,
      phase: "reveal",
      phaseDeadline: null,
      players: state.players.map((p) =>
        p.streak === 0 ? p : { ...p, streak: 0 },
      ),
    },
    { type: "expired", countryId: currentId, at: now },
  );
}

/** Points for a claim inside the window, given the player's run so far. */
export function scoreClaim(
  state: RaceState,
  player: RacePlayer,
  elapsedMs: number,
): { points: number; breakdown: ScoreBreakdown } {
  const left = Math.max(0, 1 - elapsedMs / state.config.countryWindowMs);
  const speed = Math.round(RACE_SCORING.speedMax * left);
  const accuracy = player.attemptIds.length === 0 ? RACE_SCORING.accuracy : 0;
  // `streak` already counts this claim, so the second in a row earns one step.
  const combo = Math.min(
    RACE_SCORING.comboMax,
    RACE_SCORING.comboStep * Math.max(0, player.streak - 1),
  );
  const breakdown = {
    claim: RACE_SCORING.claim,
    speed,
    accuracy,
    combo,
    recovery: 0,
  };
  return { points: breakdown.claim + speed + accuracy + combo, breakdown };
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
      s = reveal(s, now);
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
  if ((s.phase !== "racing" && s.phase !== "reveal") || s.currentId === null)
    return s;

  const index = s.players.findIndex((p) => p.id === playerId);
  if (index === -1) return s;
  const player = s.players[index];
  if (!player.connected) return s;
  if (player.lockedUntil !== null && player.lockedUntil > now) return s;
  // Free click: a country that has already been claimed or expired.
  if (s.results[countryId]) return s;

  if (countryId === s.currentId) {
    const elapsedMs = Math.max(0, now - (s.shownAt ?? now));

    if (s.phase === "reveal") {
      // Picked up after the miss: a flat bonus, no claim, no streak.
      const points = RACE_SCORING.recovery;
      const breakdown = {
        claim: 0,
        speed: 0,
        accuracy: 0,
        combo: 0,
        recovery: points,
      };
      const next = log(
        {
          ...s,
          players: updatePlayer(s, index, {
            recoveries: player.recoveries + 1,
            score: player.score + points,
          }),
        },
        {
          type: "recovery",
          playerId,
          countryId,
          elapsedMs,
          points,
          breakdown,
          streak: 0,
          at: now,
        },
      );
      return resolveCurrent(next, playerId, elapsedMs, now, points, true);
    }

    const streak = player.streak + 1;
    const { points, breakdown } = scoreClaim(
      s,
      { ...player, streak },
      elapsedMs,
    );
    const next = log(
      {
        ...s,
        // A claim is everyone else's streak ending.
        players: s.players.map((p, i) =>
          i === index
            ? {
                ...p,
                claims: p.claims + 1,
                score: p.score + points,
                streak,
                bestStreak: Math.max(p.bestStreak, streak),
                totalClaimMs: p.totalClaimMs + elapsedMs,
              }
            : p.streak === 0
              ? p
              : { ...p, streak: 0 },
        ),
      },
      {
        type: "claim",
        playerId,
        countryId,
        elapsedMs,
        points,
        breakdown,
        streak,
        at: now,
      },
    );
    return resolveCurrent(next, playerId, elapsedMs, now, points);
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
export function leave(
  state: RaceState,
  playerId: string,
  now: number,
): RaceState {
  if (state.phase === "finished") return state;
  const index = state.players.findIndex((p) => p.id === playerId);
  if (index === -1 || !state.players[index].connected) return state;

  const players = updatePlayer(state, index, { connected: false });
  const next = { ...state, players };
  return players.some((p) => p.connected) ? next : finish(next, now);
}

/**
 * End the race now. Who may call this is the server's decision (the host);
 * the engine only settles the state. Countries not yet resolved stay out of
 * `results`, so standings reflect what was actually played.
 */
export function end(state: RaceState, now: number): RaceState {
  return state.phase === "finished" ? state : finish(state, now);
}

/** A departed player reconnects. No-op once the race has finished. */
export function rejoin(state: RaceState, playerId: string): RaceState {
  if (state.phase === "finished") return state;
  const index = state.players.findIndex((p) => p.id === playerId);
  if (index === -1 || state.players[index].connected) return state;
  return { ...state, players: updatePlayer(state, index, { connected: true }) };
}

/**
 * Players ordered by score (desc), then claims (desc), then total claim time
 * (asc), then id so the order is deterministic. Position 0 leads; a draw is
 * two players equal on all three. The engine does not declare a winner.
 */
export function standings(state: RaceState): RacePlayer[] {
  return [...state.players].sort(
    (a, b) =>
      b.score - a.score ||
      b.claims - a.claims ||
      a.totalClaimMs - b.totalClaimMs ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/**
 * Whether nobody took the lead: the top two are level on every tiebreak
 * `standings` ranks by, so only the id — which is not a result — separates
 * them. Takes the ranked list, since a caller showing standings has one.
 */
export function isDraw(ranked: readonly RacePlayer[]): boolean {
  const [leader, runnerUp] = ranked;
  if (leader === undefined || runnerUp === undefined) return false;
  return (
    leader.score === runnerUp.score &&
    leader.claims === runnerUp.claims &&
    leader.totalClaimMs === runnerUp.totalClaimMs
  );
}
