import type { RaceRoom } from "./race-room";

export interface Env {
  /** Typed so the worker can call `open()` on a room over RPC. */
  RACE_ROOM: DurableObjectNamespace<RaceRoom>;
  /** Cloudflare's native rate limiter, applied to room creation. */
  ROOM_LIMITER: RateLimit;
  /** Comma-separated origins allowed to call the API and open sockets. */
  ALLOWED_ORIGINS: string;
}
