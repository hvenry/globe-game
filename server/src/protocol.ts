/**
 * Wire protocol between the race client and the room Durable Object.
 *
 * Every server message that carries timing also carries `serverNow`. All
 * deadlines in `RaceState` are absolute epoch ms, so a client whose clock is
 * skewed would render the wrong countdown; it corrects with
 * `offset = serverNow - Date.now()` measured on receipt.
 *
 * State is broadcast whole rather than as deltas. The state is small, and it
 * makes reconnection a no-op: a rejoining client gets the same message a
 * connected one does.
 */

import type { RaceConfig, RaceState } from "../../lib/engine/types";
import type {
  ClientMessage,
  ErrorCode,
  LobbyState,
  ServerMessage,
} from "../../lib/race/types";

export function encode(msg: ServerMessage): string {
  return JSON.stringify(msg);
}

interface Field {
  type: "string" | "number" | "boolean";
  optional?: boolean;
}

/** The fields each client message carries. Anything else on the frame is dropped. */
const SHAPES: Record<ClientMessage["t"], Record<string, Field>> = {
  join: {
    name: { type: "string" },
    color: { type: "string", optional: true },
    playerId: { type: "string", optional: true },
  },
  ready: { ready: { type: "boolean" } },
  configure: {
    countrySetId: { type: "string", optional: true },
    countryCount: { type: "number", optional: true },
  },
  color: { color: { type: "string" } },
  start: {},
  guess: { countryId: { type: "string" } },
  ping: {},
};

/** Parse an untrusted client frame. Returns null rather than throwing. */
export function decode(raw: string | ArrayBuffer): ClientMessage | null {
  if (typeof raw !== "string") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const frame = parsed as Record<string, unknown>;
  const t = frame.t;
  // `hasOwn`, not `in`: otherwise `"toString"` would name a shape.
  if (typeof t !== "string" || !Object.hasOwn(SHAPES, t)) return null;

  const msg: Record<string, unknown> = { t };
  for (const [name, field] of Object.entries(SHAPES[t as ClientMessage["t"]])) {
    const value = frame[name];
    if (value === undefined && field.optional) continue;
    if (typeof value !== field.type) return null;
    msg[name] = value;
  }
  return msg as ClientMessage;
}

export type { ClientMessage, ErrorCode, ServerMessage, RaceConfig, RaceState, LobbyState };
