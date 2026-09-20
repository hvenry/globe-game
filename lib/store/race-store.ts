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
  /** Stepped out mid-race. The seat is kept; `rejoin` reclaims it. */
  | "left"
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

  /** What we joined as, so a rejoin needs no form. */
  joinedAs: { name: string; color?: PlayerColorId } | null;

  join: (roomId: string, name: string, color?: PlayerColorId) => void;
  /** Drop the socket but keep the room on screen, with a way back in. */
  leaveRace: () => void;
  rejoin: () => void;
  setReady: (ready: boolean) => void;
  setColor: (color: PlayerColorId) => void;
  configure: (patch: {
    countrySetId?: CountrySetId;
    countryCount?: number;
    maxPlayers?: number;
    showHints?: boolean;
    countryWindowSec?: number;
  }) => void;
  kick: (playerId: string) => void;
  start: () => void;
  /** Reopen a finished room for another round. */
  rematch: () => void;
  /** Host only: end the running race now. */
  end: () => void;
  guess: (countryId: string) => void;
  leave: () => void;
}

/**
 * The socket lives outside the store. Zustand holds serialisable state; a live
 * WebSocket in it would be copied and compared on every update.
 */
let client: RaceClient | null = null;

/** Drop the socket for good. `join` reconnects by building a fresh client. */
function closeClient(): void {
  client?.close();
  client = null;
}

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
  joinedAs: null,

  join: (roomId, name, color) => {
    client?.close();
    set({
      status: "connecting",
      roomId,
      error: null,
      attemptIds: [],
      joinedAs: { name, color },
    });

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

  kick: (playerId) => client?.send({ t: "kick", playerId }),

  start: () => client?.send({ t: "start" }),

  rematch: () => {
    // Reopens the room if nobody has yet (a no-op on the server otherwise),
    // and moves this client to the waiting room now.
    client?.send({ t: "rematch" });
    set({ status: "lobby", race: null, standings: null, attemptIds: [] });
  },

  end: () => client?.send({ t: "end" }),

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

  leaveRace: () => {
    closeClient();
    set({ status: "left", connection: "closed", attempts: 0, attemptIds: [] });
  },

  rejoin: () => {
    const { roomId, joinedAs } = get();
    if (!roomId || !joinedAs) return;
    get().join(roomId, joinedAs.name, joinedAs.color);
  },

  leave: () => {
    closeClient();
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
      joinedAs: null,
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

    case "lobby": {
      // A reopened room reaches everyone, but leaving the results is each
      // player's own move: on the results screen the lobby is stored and the
      // screen stays put until `rematch` is pressed here.
      const { status } = get();
      const reading = status === "finished" && !msg.lobby.started;
      set({
        status: msg.lobby.started || reading ? status : "lobby",
        lobby: msg.lobby,
        canStart: msg.canStart,
        clockOffset: msg.serverNow - Date.now(),
        // Otherwise a reopened room has no race: drop the old one, or its
        // fills would stay painted behind the waiting room.
        ...(msg.lobby.started || reading
          ? null
          : { race: null, standings: null, attemptIds: [] }),
      });
      break;
    }

    case "state": {
      const { race, attemptIds } = get();
      set({
        status: "racing",
        race: msg.state,
        // Misses belong to the country that was showing when they happened.
        attemptIds: msg.state.currentId === race?.currentId ? attemptIds : [],
        clockOffset: msg.serverNow - Date.now(),
      });
      break;
    }

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
      // Being removed or turned away is the same shape: no seat, no retry.
      if (
        msg.code === "no_such_room" ||
        msg.code === "kicked" ||
        msg.code === "room_full"
      ) {
        closeClient();
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

/** The hexes a colour id stands for, falling back to the first of them. */
export function playerPalette(color: string): {
  claim: string;
  attempt: string;
} {
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
 * claimant's colour, every player's misses on the live country as dots in
 * their colour, and a country nobody reached in the palette's "missed" red.
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
      // Stippled in the player's own colour: the dots say "tried", the
      // colour says who, and neither can pass for a solid claim.
      fills[countryId] = {
        color: playerPalette(player.color).claim,
        opacity: opacity.attempt,
        pattern: "dots",
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
