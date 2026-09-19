/**
 * Pre-race lobby rules as pure transition functions.
 *
 * Same contract as `lib/engine`: no I/O, no clock of its own, no mutation,
 * and the input state returned unchanged for a no-op. The Durable Object
 * holds the sockets and the storage; everything decidable lives here so it
 * can be tested without a runtime.
 *
 * Once the race starts, `lib/engine/race.ts` owns connection state. The
 * lobby's `connected` flag only governs who is dealt into the race.
 */

import {
  PLAYER_COLOR_IDS,
  RACE_CONFIG,
  type PlayerColorId,
} from "../../lib/constants";
import type { RaceConfig } from "../../lib/engine/types";
import type { CountrySetId } from "../../lib/geo/country-sets";
import type { RacePlayerInput } from "../../lib/engine/race";
import {
  LOBBY_LIMITS,
  RACE_WINDOW_SECONDS,
  type LobbyPlayer,
  type LobbyState,
} from "../../lib/race/types";

export { LOBBY_LIMITS };
export type { LobbyPlayer, LobbyState };

/**
 * Collapse whitespace, cap length, and fall back to a stable placeholder —
 * for a blank name and equally for one too short to identify a player by.
 */
export function sanitizeName(raw: string, fallback = "Player"): string {
  const cleaned = raw
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LOBBY_LIMITS.maxNameLength);
  return cleaned.length >= LOBBY_LIMITS.minNameLength ? cleaned : fallback;
}

/**
 * Room defaults. `RACE_CONFIG` also carries `countdownMs`, which belongs to
 * the lobby rather than the race, so the fields are copied across explicitly.
 */
export function defaultRaceConfig(): RaceConfig {
  return {
    countrySetId: "all",
    countryCount: RACE_CONFIG.countryCount,
    countryWindowMs: RACE_CONFIG.countryWindowMs,
    lockoutMs: RACE_CONFIG.lockoutMs,
    intermissionMs: RACE_CONFIG.intermissionMs,
    showHints: false,
  };
}

/**
 * The first colour no seat holds. `maxPlayers` matches the palette, so a room
 * with a free seat always has a free colour; the wrap is only a guard against
 * the two drifting apart.
 */
function freeColor(state: LobbyState): PlayerColorId {
  const taken = state.players.map((p) => p.color);
  return (
    PLAYER_COLOR_IDS.find((c) => !taken.includes(c)) ??
    PLAYER_COLOR_IDS[taken.length % PLAYER_COLOR_IDS.length]
  );
}

export function createLobby(
  roomId: string,
  config: RaceConfig,
  createdAt: number,
): LobbyState {
  return {
    roomId,
    hostId: null,
    players: [],
    maxPlayers: LOBBY_LIMITS.defaultPlayers,
    kickedIds: [],
    config,
    createdAt,
    started: false,
  };
}

/** First connected player in seat order, or null when the room is empty. */
function nextHost(players: LobbyPlayer[]): string | null {
  return players.find((p) => p.connected)?.id ?? null;
}

/**
 * Seat a player, or reconnect one who already holds `id`. A returning player
 * keeps their seat and ready flag; only their name is refreshed. Returns the
 * state unchanged when the room is full.
 */
export function join(
  state: LobbyState,
  id: string,
  name: string,
  color?: PlayerColorId,
): LobbyState {
  const clean = sanitizeName(name);

  if (state.players.some((p) => p.id === id)) {
    const players = state.players.map((p) =>
      p.id === id ? { ...p, name: clean, connected: true } : p,
    );
    return { ...state, players, hostId: state.hostId ?? nextHost(players) };
  }

  if (state.started) return state;
  if (state.kickedIds.includes(id)) return state;
  if (connectedPlayers(state).length >= state.maxPlayers) return state;

  // A preference is honoured only if the seat next to you is not already
  // wearing it; two identical dots on the globe would defeat the point.
  const taken = state.players.some((p) => p.color === color);
  const seat = {
    id,
    name: clean,
    color: color !== undefined && !taken ? color : freeColor(state),
    connected: true,
    ready: false,
  };
  return {
    ...state,
    players: [...state.players, seat],
    hostId: state.hostId ?? id,
  };
}

/**
 * Claim an identity colour. A colour another seat holds is refused outright
 * rather than swapped: a swap would change a third party's colour mid-lobby.
 */
export function setColor(
  state: LobbyState,
  id: string,
  color: PlayerColorId,
): LobbyState {
  const player = state.players.find((p) => p.id === id);
  if (!player || player.color === color) return state;
  if (state.players.some((p) => p.id !== id && p.color === color)) return state;
  return {
    ...state,
    players: state.players.map((p) => (p.id === id ? { ...p, color } : p)),
  };
}

/**
 * Mark a player disconnected, keeping their seat so a reload can reclaim it.
 * Hands the host role to the next connected player when the host drops.
 */
export function leave(state: LobbyState, id: string): LobbyState {
  const player = state.players.find((p) => p.id === id);
  if (!player || !player.connected) return state;

  const players = state.players.map((p) =>
    p.id === id ? { ...p, connected: false, ready: false } : p,
  );
  return {
    ...state,
    players,
    hostId: state.hostId === id ? nextHost(players) : state.hostId,
  };
}

export function setReady(
  state: LobbyState,
  id: string,
  ready: boolean,
): LobbyState {
  const player = state.players.find((p) => p.id === id);
  if (!player || !player.connected || player.ready === ready) return state;
  return {
    ...state,
    players: state.players.map((p) => (p.id === id ? { ...p, ready } : p)),
  };
}

/**
 * Host removes a player. The seat goes entirely, and the id is remembered so
 * the same credential cannot walk straight back in. The host cannot kick
 * themselves; that is `leave`.
 */
export function kick(
  state: LobbyState,
  hostId: string,
  targetId: string,
): LobbyState {
  if (state.hostId !== hostId || hostId === targetId || state.started)
    return state;
  if (!state.players.some((p) => p.id === targetId)) return state;
  return {
    ...state,
    players: state.players.filter((p) => p.id !== targetId),
    kickedIds: [...state.kickedIds, targetId],
  };
}

/** Host-only room settings. Non-hosts and out-of-range values are ignored. */
export function configure(
  state: LobbyState,
  id: string,
  patch: {
    countrySetId?: CountrySetId;
    countryCount?: number;
    maxPlayers?: number;
    showHints?: boolean;
    countryWindowSec?: number;
  },
): LobbyState {
  if (state.hostId !== id || state.started) return state;

  let next = state;
  if (patch.maxPlayers !== undefined) {
    // Never below the people already in the room: shrinking cannot evict.
    const floor = Math.max(
      LOBBY_LIMITS.minPlayers,
      connectedPlayers(state).length,
    );
    const seats = Math.round(patch.maxPlayers);
    if (
      seats >= floor &&
      seats <= LOBBY_LIMITS.maxPlayers &&
      seats !== state.maxPlayers
    ) {
      next = { ...next, maxPlayers: seats };
    }
  }

  let config = state.config;
  if (
    patch.countrySetId !== undefined &&
    patch.countrySetId !== config.countrySetId
  ) {
    config = { ...config, countrySetId: patch.countrySetId };
  }
  if (patch.countryCount !== undefined) {
    // NaN and the infinities fall out of the range check on their own.
    const count = Math.round(patch.countryCount);
    const inRange =
      count >= LOBBY_LIMITS.minCountryCount &&
      count <= LOBBY_LIMITS.maxCountryCount;
    if (inRange && count !== config.countryCount) {
      config = { ...config, countryCount: count };
    }
  }
  if (patch.showHints !== undefined && patch.showHints !== config.showHints) {
    config = { ...config, showHints: patch.showHints };
  }
  if (
    patch.countryWindowSec !== undefined &&
    RACE_WINDOW_SECONDS.includes(patch.countryWindowSec)
  ) {
    const ms = patch.countryWindowSec * 1000;
    if (ms !== config.countryWindowMs)
      config = { ...config, countryWindowMs: ms };
  }
  if (config !== state.config) next = { ...next, config };
  return next;
}

export function connectedPlayers(state: LobbyState): LobbyPlayer[] {
  return state.players.filter((p) => p.connected);
}

/** Enough players present, and every one of them ready. */
export function canStart(state: LobbyState): boolean {
  if (state.started) return false;
  const present = connectedPlayers(state);
  return (
    present.length >= LOBBY_LIMITS.minPlayers && present.every((p) => p.ready)
  );
}

/** The roster handed to `createRace`. Disconnected seats are not dealt in. */
export function toRacePlayers(state: LobbyState): RacePlayerInput[] {
  return connectedPlayers(state).map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
  }));
}

export function markStarted(state: LobbyState): LobbyState {
  return state.started ? state : { ...state, started: true };
}

/**
 * Back to the waiting room after a race. Seats, colours, host and settings
 * all carry over; only readiness resets, so nobody is dealt into the next
 * race by accident.
 */
export function reopen(state: LobbyState): LobbyState {
  if (!state.started) return state;
  return {
    ...state,
    started: false,
    players: state.players.map((p) => (p.ready ? { ...p, ready: false } : p)),
  };
}
