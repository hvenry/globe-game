/**
 * Worker entry point: the whole server surface for the race mode.
 *
 * Two routes — create a room, and open a socket to one. Everything stateful
 * lives in the `RaceRoom` Durable Object; this handler only mints room ids and
 * forwards upgrades to the right instance.
 *
 * CORS matters here because the game client is served from a different origin
 * while the site remains on Vercel.
 */

import { isCountrySetId } from "./country-pool";
import type { Env } from "./env";
import { isAllowedOrigin, parseAllowlist } from "./origin";
import { ROOM_ALPHABET, ROOM_CODE_LENGTH, isRoomCode } from "../../lib/race/room-code";

export { RaceRoom } from "./race-room";

function newRoomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));
  let id = "";
  for (const byte of bytes) id += ROOM_ALPHABET[byte % ROOM_ALPHABET.length];
  return id;
}

function originAllowed(request: Request, env: Env): boolean {
  return isAllowedOrigin(request.headers.get("Origin"), parseAllowlist(env.ALLOWED_ORIGINS));
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (origin === null || !isAllowedOrigin(origin, parseAllowlist(env.ALLOWED_ORIGINS))) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body: unknown, cors: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/api/rooms" && request.method === "POST") {
      if (!originAllowed(request, env)) {
        return json({ error: "origin not allowed" }, cors, 403);
      }
      // Each room creation spins up a Durable Object, so this is the endpoint
      // worth metering.
      const ip = request.headers.get("CF-Connecting-IP") ?? "anonymous";
      const { success } = await env.ROOM_LIMITER.limit({ key: ip });
      if (!success) {
        return json({ error: "too many rooms, slow down" }, cors, 429);
      }

      // Settings are applied by the host over the socket, but accepting them
      // here lets an invite link carry the intended set.
      const requested = url.searchParams.get("set");
      const countrySetId = requested && isCountrySetId(requested) ? requested : "all";

      // Minting the code and opening the object happen together, here and
      // nowhere else: a socket cannot bring a room into existence, so nobody
      // can pick their own code or squat someone else's, and every room that
      // exists was counted against the limiter above. `open` declines an id
      // that is already taken, which is the collision retry.
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const roomId = newRoomId();
        const stub = env.RACE_ROOM.get(env.RACE_ROOM.idFromName(roomId));
        if (await stub.open(roomId, countrySetId)) {
          return json({ roomId, countrySetId }, cors, 201);
        }
      }
      return json({ error: "could not allocate a room, try again" }, cors, 503);
    }

    const match = url.pathname.match(/^\/api\/rooms\/([^/]+)\/ws$/);
    if (match && request.method === "GET") {
      if (!originAllowed(request, env)) {
        return json({ error: "origin not allowed" }, cors, 403);
      }
      const roomId = match[1].toUpperCase();
      if (!isRoomCode(roomId)) {
        return json({ error: "invalid room id" }, cors, 400);
      }
      // The room id *is* the routing key — every player of a match lands on
      // the same object, wherever they connect from.
      const stub = env.RACE_ROOM.get(env.RACE_ROOM.idFromName(roomId));
      return stub.fetch(request);
    }

    if (url.pathname === "/health") {
      return json({ ok: true }, cors);
    }

    return json({ error: "not found" }, cors, 404);
  },
} satisfies ExportedHandler<Env>;
