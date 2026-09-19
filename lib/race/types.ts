/**
 * Shared race types: the wire protocol and the lobby shape.
 *
 * These live in `lib/` rather than `server/` because both sides need them and
 * two drifting copies of a protocol is how clients and servers stop agreeing.
 * The server owns the *rules* (`server/src/lobby.ts`) and the validation
 * (`server/src/protocol.ts`); this file is only the vocabulary.
 */

import type { RaceConfig, RacePlayer, RaceState } from "../engine/types";
import type { CountrySetId } from "../geo/country-sets";
import type { PlayerColorId } from "../constants";

export const LOBBY_LIMITS = {
  /** One seat per identity colour, so no two players share one. */
  maxPlayers: 4,
  minPlayers: 2,
  minNameLength: 2,
  maxNameLength: 16,
  minCountryCount: 5,
  /** Above the whole world, so "the whole set" is a legal count. */
  maxCountryCount: 250,
} as const;

export interface LobbyPlayer {
  id: string;
  name: string;
  /** Identity colour, unique among the room's seats. */
  color: PlayerColorId;
  connected: boolean;
  ready: boolean;
}

export interface LobbyState {
  roomId: string;
  /** First connected joiner. Reassigned when the host disconnects. */
  hostId: string | null;
  players: LobbyPlayer[];
  /** Includes the country set — `RaceConfig` owns it, so the lobby does not. */
  config: RaceConfig;
  createdAt: number;
  /** Set once the race is created so a late joiner cannot re-enter the lobby. */
  started: boolean;
}

export type ClientMessage =
  /** First message on every connection. `playerId` re-claims a seat after a reload. */
  | { t: "join"; name: string; color?: PlayerColorId; playerId?: string }
  | { t: "ready"; ready: boolean }
  /** Host only, lobby only. */
  | { t: "configure"; countrySetId?: CountrySetId; countryCount?: number }
  | { t: "color"; color: PlayerColorId }
  /** Host only. Validated against `canStart`. */
  | { t: "start" }
  | { t: "guess"; countryId: string }
  | { t: "ping" };

export type ServerMessage =
  /** Sent once per connection. `playerId` is the reconnect credential — keep it. */
  | { t: "welcome"; playerId: string; roomId: string; serverNow: number }
  | { t: "lobby"; lobby: LobbyState; canStart: boolean; serverNow: number }
  | { t: "state"; state: RaceState; serverNow: number }
  | { t: "finished"; state: RaceState; standings: RacePlayer[]; serverNow: number }
  | { t: "error"; code: ErrorCode; message: string }
  | { t: "pong"; serverNow: number };

export type ErrorCode =
  | "bad_message"
  | "no_such_room"
  | "not_joined"
  | "not_host"
  | "cannot_start"
  | "room_full"
  | "already_started"
  | "rate_limited";
