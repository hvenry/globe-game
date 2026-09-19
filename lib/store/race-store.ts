"use client";

/**
 * Client-side adapter for a race room.
 *
 * Mirrors how `game-store` relates to `lib/engine`: the store never decides an
 * outcome. It holds whatever the server last broadcast and forwards intents.
 * Every rule — who claimed a country, who is locked out, when a window ends —
 * is the server's call.
 */

import { create } from "zustand";
import type { RacePlayer, RaceState, Resolution } from "@/lib/engine/types";
import {
  PLAYER_COLORS,
  PLAYER_INKS,
  isPlayerColorId,
  type CountryFill,
  type PlayerColorId,
} from "@/lib/constants";
import { useSettingsStore } from "@/lib/store/settings-store";
import type { CountrySetId } from "@/lib/geo/country-sets";
import type { LobbyState, ServerMessage } from "@/lib/race/types";
import { RaceClient, createRoom } from "@/lib/race/client";
import { rememberPlayerId, rememberedPlayerId } from "@/lib/race/session";

export type RaceStatus =
  | "idle"
  | "connecting"
  | "lobby"
  | "racing"
  | "finished"
  | "error";

interface RaceStoreState {
  status: RaceStatus;
  connection: "connecting" | "open" | "closed";
  /** Consecutive failed connection attempts; drives the "unreachable" notice. */
  attempts: number;
  roomId: string | null;
  playerId: string | null;
  lobby: LobbyState | null;
  canStart: boolean;
  race: RaceState | null;
  standings: RacePlayer[] | null;
  error: string | null;
  /** Your own misses on the country showing now, held only until the server
   *  echoes them back on every player — this is what makes your own click
   *  paint without waiting for the round trip. */
  attemptIds: string[];
  /** `serverNow - Date.now()`, so absolute deadlines survive a skewed clock. */
  clockOffset: number;

  join: (roomId: string, name: string, color?: PlayerColorId) => void;
  setReady: (ready: boolean) => void;
  setColor: (color: PlayerColorId) => void;
  configure: (patch: { countrySetId?: CountrySetId; countryCount?: number }) => void;
  start: () => void;
  guess: (countryId: string) => void;
  leave: () => void;
}

/**
 * The socket lives outside the store. Zustand holds serialisable state; a live
 * WebSocket in it would be copied and compared on every update.
 */
let client: RaceClient | null = null;

export const useRaceStore = create<RaceStoreState>()((set, get) => ({
  status: "idle",
  connection: "closed",
  attempts: 0,
  roomId: null,
  playerId: null,
  lobby: null,
  canStart: false,
  race: null,
  standings: null,
  error: null,
  attemptIds: [],
  clockOffset: 0,

  join: (roomId, name, color) => {
    client?.close();
    set({ status: "connecting", roomId, error: null, attemptIds: [] });

    client = new RaceClient(roomId, {
      onStatus: (connection, attempts) => {
        set({ connection, attempts });
        // The server only ever replies; claim the seat the moment we can,
        // including after a reconnect, which is what resumes the same seat.
        if (connection === "open") {
          client?.send({
            t: "join",
            name,
            color,
            playerId: rememberedPlayerId(roomId),
          });
        }
      },
      onMessage: (msg) => applyMessage(msg, set, get),
    });
    client.connect();
  },

  setReady: (ready) => client?.send({ t: "ready", ready }),

  setColor: (color) => client?.send({ t: "color", color }),

  configure: (patch) => client?.send({ t: "configure", ...patch }),

  start: () => client?.send({ t: "start" }),

  guess: (countryId) => {
    // The client knows the answer — it is on screen — so your own miss can
    // paint at once; the broadcast that follows carries everyone's.
    const { race, attemptIds } = get();
    if (
      race?.phase === "racing" &&
      race.currentId !== null &&
      countryId !== race.currentId &&
      !attemptIds.includes(countryId)
    ) {
      set({ attemptIds: [...attemptIds, countryId] });
    }
    client?.send({ t: "guess", countryId });
  },

  leave: () => {
    client?.close();
    client = null;
    set({
      status: "idle",
      connection: "closed",
      attempts: 0,
      roomId: null,
      lobby: null,
      race: null,
      standings: null,
      canStart: false,
      error: null,
      attemptIds: [],
    });
  },
}));

type Setter = (partial: Partial<RaceStoreState>) => void;
type Getter = () => RaceStoreState;

function applyMessage(msg: ServerMessage, set: Setter, get: Getter): void {
  switch (msg.t) {
    case "welcome":
      rememberPlayerId(msg.roomId, msg.playerId);
      set({ playerId: msg.playerId, clockOffset: msg.serverNow - Date.now() });
      break;

    case "lobby":
      set({
        status: msg.lobby.started ? get().status : "lobby",
        lobby: msg.lobby,
        canStart: msg.canStart,
        clockOffset: msg.serverNow - Date.now(),
      });
      break;

    case "state":
      set({
        status: "racing",
        race: msg.state,
        // Misses belong to the country that was showing when they happened.
        attemptIds:
          msg.state.currentId === get().race?.currentId ? get().attemptIds : [],
        clockOffset: msg.serverNow - Date.now(),
      });
      break;

    case "finished":
      set({
        status: "finished",
        race: msg.state,
        standings: msg.standings,
        clockOffset: msg.serverNow - Date.now(),
      });
      break;

    case "error":
      // The code names no room the server ever minted. Retrying cannot help,
      // so drop the socket and hand the player back the join form with the
      // reason on it.
      if (msg.code === "no_such_room") {
        client?.close();
        client = null;
        set({
          status: "idle",
          connection: "closed",
          attempts: 0,
          roomId: null,
          lobby: null,
          // The room is gone, so its race goes with it: `useRaceGlobe` reads
          // `race` whatever the status, and a dead race would keep painting
          // its fills behind the join form.
          race: null,
          standings: null,
          canStart: false,
          attemptIds: [],
          error: msg.message,
        });
        break;
      }
      // A rate-limit nudge is transient; anything else is worth surfacing.
      if (msg.code !== "rate_limited") set({ error: msg.message });
      break;

    case "pong":
      set({ clockOffset: msg.serverNow - Date.now() });
      break;
  }
}

export { createRoom };

/** Server deadlines are absolute; correct them into this browser's clock. */
export function useServerNow(): () => number {
  const offset = useRaceStore((s) => s.clockOffset);
  return () => Date.now() + offset;
}

/** The hexes a colour id stands for, falling back to the first of them. */
export function playerPalette(color: string): { claim: string; attempt: string } {
  return PLAYER_COLORS[isPlayerColorId(color) ? color : "blue"];
}

/**
 * A player's colour as readable type on a panel. Returns a lookup rather
 * than a colour so a list can tint every row from one hook call.
 */
export function usePlayerInk(): (color: string) => string {
  const inks = PLAYER_INKS[useSettingsStore((s) => s.theme)];
  return (color) => inks[isPlayerColorId(color) ? color : "blue"];
}

/**
 * What the globe paints during a race: every claimed country in its
 * claimant's colour, every player's misses on the live country in their
 * paler variant, and a country nobody reached in the palette's "missed" red.
 *
 * Opacity comes from the caller because it is the theme's business, and this
 * module cannot see the theme.
 */
export function raceFills(
  race: RaceState | null,
  playerId: string | null,
  ownAttemptIds: readonly string[],
  opacity: { claim: number; attempt: number },
): Record<string, Resolution | CountryFill> {
  if (!race) return {};
  const fills: Record<string, Resolution | CountryFill> = {};

  // Misses first: a country that later resolves is overwritten by its result.
  // Everyone's, from the shared state — knowing what an opponent has already
  // ruled out is half the game.
  for (const player of race.players) {
    const own = player.id === playerId;
    const attempts = own
      ? [...new Set([...player.attemptIds, ...ownAttemptIds])]
      : player.attemptIds;
    for (const countryId of attempts) {
      fills[countryId] = {
        color: playerPalette(player.color).attempt,
        opacity: opacity.attempt,
      };
    }
  }

  for (const [countryId, result] of Object.entries(race.results)) {
    if (result.by === null) {
      fills[countryId] = "failed";
      continue;
    }
    const owner = race.players.find((p) => p.id === result.by);
    fills[countryId] = {
      color: playerPalette(owner?.color ?? "blue").claim,
      opacity: opacity.claim,
    };
  }
  return fills;
}
