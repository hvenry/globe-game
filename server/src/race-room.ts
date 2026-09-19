/**
 * One Durable Object per race room.
 *
 * The object is the room: `idFromName(roomId)` routes every player of a match
 * to the same instance, so there is no room registry and no sticky routing.
 * Because a Durable Object runs single-threaded, two simultaneous claims are
 * serialised by the runtime and the first one processed wins — which is
 * exactly the tie-break the engine assumes.
 *
 * Timing is driven entirely by `nextTransitionAt`: after every state change we
 * set a storage alarm for that instant. Between alarms the object hibernates
 * with its sockets still open, so an idle room costs nothing.
 *
 * All game rules live in `lib/engine/race.ts` and all lobby rules in
 * `./lobby.ts`. This class only moves bytes, persists state, and keeps time.
 */

import { DurableObject } from "cloudflare:workers";

import { RACE_CONFIG } from "../../lib/constants";
import { randomSeed } from "../../lib/engine/rng";
import {
  createRace,
  end as applyEnd,
  guess as applyGuess,
  leave as applyLeave,
  nextTransitionAt,
  rejoin as applyRejoin,
  standings,
  tick,
} from "../../lib/engine/race";
import type { RaceState } from "../../lib/engine/types";

import { isPlayerColorId } from "../../lib/constants";
import { isCountrySetId, poolFor } from "./country-pool";
import type { Env } from "./env";
import { ROOM_LIMITS } from "./limits";
import {
  canStart,
  configure,
  createLobby,
  defaultRaceConfig,
  join as joinLobby,
  kick as kickLobby,
  leave as leaveLobby,
  markStarted,
  reopen,
  setColor,
  setReady,
  toRacePlayers,
  type LobbyState,
} from "./lobby";
import { decode, encode, type ErrorCode, type ServerMessage } from "./protocol";

const KEY_LOBBY = "lobby";
const KEY_RACE = "race";
const KEY_CLEANUP = "cleanupAt";

/**
 * Per-socket state. Sockets survive hibernation but memory does not, so this
 * rides along in the socket's attachment rather than in a field.
 */
interface Attachment {
  playerId: string | null;
  tokens: number;
  refilledAt: number;
}

export class RaceRoom extends DurableObject<Env> {
  private lobby: LobbyState | null = null;
  private race: RaceState | null = null;
  /** When to tear the room down; null while it is still in use. */
  private cleanupAt: number | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Hibernation runs the constructor again on every wake, so nothing is
    // assumed to have survived in memory.
    ctx.blockConcurrencyWhile(async () => {
      this.lobby = (await ctx.storage.get<LobbyState>(KEY_LOBBY)) ?? null;
      this.race = (await ctx.storage.get<RaceState>(KEY_RACE)) ?? null;
      this.cleanupAt = (await ctx.storage.get<number>(KEY_CLEANUP)) ?? null;
    });
  }

  /**
   * Bring the room into existence. Only the worker's create endpoint calls
   * this, right after it mints the code — a socket can never open a room, so
   * every code in play is one the server generated. That is what stops a
   * player from claiming a chosen (or someone else's) code, and it keeps room
   * creation behind the one rate-limited endpoint.
   *
   * Returns false if the id is already taken, so the caller can mint another.
   */
  async open(roomId: string, countrySetId: string): Promise<boolean> {
    if (this.lobby || this.race) return false;

    const now = Date.now();
    this.lobby = createLobby(
      roomId,
      { ...defaultRaceConfig(), countrySetId },
      now,
    );
    await this.ctx.storage.put(KEY_LOBBY, this.lobby);
    // Nobody is connected yet, so the room starts out on the idle clock.
    this.refreshCleanup(now);
    await this.scheduleNext();
    return true;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("expected a websocket upgrade", { status: 426 });
    }

    const { 0: client, 1: server } = new WebSocketPair();
    // Hibernatable: the runtime holds the socket while this object sleeps.
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({
      playerId: null,
      tokens: ROOM_LIMITS.burst,
      refilledAt: Date.now(),
    } satisfies Attachment);

    // A room that was never opened owns no storage, and must not start owning
    // any here: the socket is accepted only so `join` can say so and the
    // player gets a real answer instead of a reconnect loop.
    if (this.lobby) {
      this.refreshCleanup(Date.now());
      await this.scheduleNext();
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(
    ws: WebSocket,
    raw: string | ArrayBuffer,
  ): Promise<void> {
    const size = typeof raw === "string" ? raw.length : raw.byteLength;
    if (size > ROOM_LIMITS.maxFrameBytes) {
      return this.fail(ws, "bad_message", "Message too large.");
    }
    // A flood costs the room a storage write and a broadcast per frame, so
    // spend a token before doing any of that work.
    if (!this.spendToken(ws)) {
      return this.fail(ws, "rate_limited", "Slow down.");
    }

    const msg = decode(raw);
    if (!msg) return this.fail(ws, "bad_message", "Unreadable message.");

    if (msg.t === "ping") {
      return this.send(ws, { t: "pong", serverNow: Date.now() });
    }

    if (msg.t === "join") {
      return this.handleJoin(ws, msg.name, msg.playerId, msg.color);
    }

    const playerId = this.playerIdOf(ws);
    if (!playerId) return this.fail(ws, "not_joined", "Send `join` first.");

    switch (msg.t) {
      case "ready":
        return this.mutateLobby((lobby) =>
          setReady(lobby, playerId, msg.ready),
        );
      case "color":
        // An unknown id is dropped rather than refused: the palette is the
        // client's, and a stale one is not worth an error frame.
        if (!isPlayerColorId(msg.color)) return;
        return this.mutateLobby((lobby) =>
          setColor(lobby, playerId, msg.color),
        );
      case "configure":
        if (this.lobby?.hostId !== playerId) {
          return this.fail(
            ws,
            "not_host",
            "Only the host can change settings.",
          );
        }
        return this.mutateLobby((lobby) =>
          configure(lobby, playerId, {
            countrySetId:
              msg.countrySetId && isCountrySetId(msg.countrySetId)
                ? msg.countrySetId
                : undefined,
            countryCount: msg.countryCount,
            maxPlayers: msg.maxPlayers,
            showHints: msg.showHints,
            countryWindowSec: msg.countryWindowSec,
          }),
        );
      case "kick":
        return this.handleKick(ws, playerId, msg.playerId);
      case "start":
        return this.handleStart(ws, playerId);
      case "guess":
        return this.handleGuess(playerId, msg.countryId);
      case "rematch":
        return this.handleRematch(ws);
      case "end":
        return this.handleEnd(ws, playerId);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const playerId = this.playerIdOf(ws);
    if (!playerId) return;
    // A second tab on the same seat keeps the player present.
    if (this.hasOtherSocket(playerId, ws)) return;

    if (this.race) {
      return this.commitRace(applyLeave(this.race, playerId, Date.now()));
    }
    await this.mutateLobby((lobby) => leaveLobby(lobby, playerId));
    this.refreshCleanup(Date.now());
    await this.scheduleNext();
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  /**
   * The room's only timer. It carries both jobs: advancing the race at
   * `nextTransitionAt`, and tearing the room down once it has outlived its
   * use. Whichever is due fires, then the next one is scheduled.
   */
  async alarm(): Promise<void> {
    const now = Date.now();

    if (this.cleanupAt !== null && now >= this.cleanupAt) {
      return this.destroy();
    }

    if (this.race) {
      const due = nextTransitionAt(this.race);
      if (due !== null && now >= due) {
        return this.commitRace(tick(this.race, now));
      }
    }

    this.refreshCleanup(now);
    await this.scheduleNext();
  }

  // ─── Handlers ───

  private async handleJoin(
    ws: WebSocket,
    name: string,
    claimed?: string,
    color?: string,
  ): Promise<void> {
    if (!this.lobby) {
      return this.fail(ws, "no_such_room", "No room with that code.");
    }

    // A known id re-claims its seat; anything else gets a fresh one. The id is
    // a v4 UUID, so it doubles as the reconnect credential.
    const known = claimed !== undefined && this.holdsSeat(claimed);
    const playerId = known ? claimed : crypto.randomUUID();
    ws.serializeAttachment({
      ...this.attachmentOf(ws),
      playerId,
    } satisfies Attachment);

    this.send(ws, {
      t: "welcome",
      playerId,
      roomId: this.lobby.roomId,
      serverNow: Date.now(),
    });

    if (this.race) {
      // Mid-race reconnect. Unknown ids may watch but cannot claim.
      if (known) return this.commitRace(applyRejoin(this.race, playerId));
      return this.send(ws, this.raceMessage(this.race));
    }

    const next = joinLobby(
      this.lobby,
      playerId,
      name,
      color !== undefined && isPlayerColorId(color) ? color : undefined,
    );
    if (next === this.lobby) {
      // Refused means gone: an attached socket with no seat would still hear
      // every broadcast, and the next one would drop it into a seatless room.
      this.fail(ws, "room_full", "This room is full.");
      this.closeSocket(ws, 4001, "room full");
      return;
    }
    await this.mutateLobby(() => next);
  }

  private async handleKick(
    ws: WebSocket,
    hostId: string,
    targetId: string,
  ): Promise<void> {
    const lobby = this.lobby;
    if (!lobby || this.race) return;
    if (lobby.hostId !== hostId) {
      return this.fail(ws, "not_host", "Only the host can remove players.");
    }
    const next = kickLobby(lobby, hostId, targetId);
    if (next === lobby) return;

    // Tell the player why before the socket goes, so their client shows a
    // reason instead of trying to reconnect into a seat that is gone.
    for (const socket of this.ctx.getWebSockets()) {
      if (this.playerIdOf(socket) !== targetId) continue;
      this.fail(socket, "kicked", "The host removed you from the room.");
      this.closeSocket(socket, 4000, "kicked");
    }
    await this.mutateLobby(() => next);
  }

  private async handleStart(ws: WebSocket, playerId: string): Promise<void> {
    if (this.race)
      return this.fail(ws, "already_started", "The race is already running.");
    const lobby = this.lobby;
    if (!lobby) return this.fail(ws, "bad_message", "Room is not ready.");
    if (lobby.hostId !== playerId) {
      return this.fail(ws, "not_host", "Only the host can start the race.");
    }
    if (!canStart(lobby)) {
      return this.fail(ws, "cannot_start", "Everyone needs to be ready first.");
    }

    const race = createRace(
      poolFor(lobby.config.countrySetId),
      lobby.config,
      randomSeed(),
      toRacePlayers(lobby),
      Date.now() + RACE_CONFIG.countdownMs,
    );
    this.lobby = markStarted(lobby);

    await this.ctx.storage.put(KEY_LOBBY, this.lobby);
    await this.commitRace(race);
  }

  /**
   * Any seated player can reopen a finished room: the race is over, and the
   * alternative is everyone making a new room and sharing a new code.
   */
  private async handleRematch(ws: WebSocket): Promise<void> {
    if (!this.lobby) return this.fail(ws, "bad_message", "Room is not ready.");
    // Already reopened by someone else: nothing to do, and no error — every
    // player sends this as they leave the results at their own pace.
    if (!this.race) return;
    if (this.race.phase !== "finished") {
      return this.fail(ws, "already_started", "The race is still running.");
    }
    this.race = null;
    await this.ctx.storage.delete(KEY_RACE);
    await this.mutateLobby((lobby) => reopen(lobby));
    this.refreshCleanup(Date.now());
    await this.scheduleNext();
  }

  private async handleEnd(ws: WebSocket, playerId: string): Promise<void> {
    if (this.lobby?.hostId !== playerId) {
      return this.fail(ws, "not_host", "Only the host can end the race.");
    }
    if (!this.race || this.race.phase === "finished") return;
    await this.commitRace(applyEnd(this.race, Date.now()));
  }

  private async handleGuess(
    playerId: string,
    countryId: string,
  ): Promise<void> {
    if (!this.race) return;
    const next = applyGuess(this.race, playerId, countryId, Date.now());
    // Reference equality means the click changed nothing — do not wake everyone.
    if (next === this.race) return;
    await this.commitRace(next);
  }

  // ─── State plumbing ───

  private async mutateLobby(
    fn: (lobby: LobbyState) => LobbyState,
  ): Promise<void> {
    if (!this.lobby) return;
    const next = fn(this.lobby);
    if (next === this.lobby) return;
    this.lobby = next;
    await this.ctx.storage.put(KEY_LOBBY, next);
    this.broadcastLobby();
  }

  /**
   * Adopt a new race state: persist it, tell everyone, and re-arm the alarm.
   * Re-arming on every change keeps the alarm honest when a claim ends a
   * country window early.
   */
  private async commitRace(next: RaceState): Promise<void> {
    this.race = next;
    await this.ctx.storage.put(KEY_RACE, next);
    this.broadcast(this.raceMessage(next));
    this.refreshCleanup(Date.now());
    await this.scheduleNext();
  }

  /**
   * Earliest of the race's next phase change and the room's teardown. One
   * alarm slot exists, so both deadlines compete for it and `alarm()` works
   * out which actually fired.
   */
  private async scheduleNext(): Promise<void> {
    const phaseAt = this.race ? nextTransitionAt(this.race) : null;
    const due = [phaseAt, this.cleanupAt].filter(
      (v): v is number => v !== null,
    );
    await this.ctx.storage.put(KEY_CLEANUP, this.cleanupAt);
    if (due.length === 0) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(Math.min(...due));
  }

  /**
   * A room is disposable once the race is over, or once nobody is connected.
   * Anything else clears the timer — a live room is never collected.
   */
  private refreshCleanup(now: number): void {
    const empty = this.ctx.getWebSockets().length === 0;
    if (this.race?.phase === "finished") {
      this.cleanupAt = (this.race.endedAt ?? now) + ROOM_LIMITS.finishedTtlMs;
    } else if (empty) {
      this.cleanupAt = now + ROOM_LIMITS.idleTtlMs;
    } else {
      this.cleanupAt = null;
    }
  }

  /** Drop the room entirely. Without this, every race ever played persists. */
  private async destroy(): Promise<void> {
    for (const socket of this.ctx.getWebSockets()) {
      this.closeSocket(socket, 1000, "room closed");
    }
    // Also clears the alarm.
    await this.ctx.storage.deleteAll();
    this.lobby = null;
    this.race = null;
    this.cleanupAt = null;
  }

  /**
   * Token bucket per socket, carried in the attachment so it survives
   * hibernation. Returns false when the socket has spent its allowance.
   */
  private spendToken(ws: WebSocket): boolean {
    const att = this.attachmentOf(ws);
    const now = Date.now();
    const refill = Math.max(
      0,
      ((now - att.refilledAt) / 1000) * ROOM_LIMITS.refillPerSecond,
    );
    const tokens = Math.min(ROOM_LIMITS.burst, att.tokens + refill);
    const allowed = tokens >= 1;
    ws.serializeAttachment({
      ...att,
      tokens: allowed ? tokens - 1 : tokens,
      refilledAt: now,
    } satisfies Attachment);
    return allowed;
  }

  private attachmentOf(ws: WebSocket): Attachment {
    const raw = ws.deserializeAttachment();
    if (raw && typeof raw === "object" && "tokens" in raw)
      return raw as Attachment;
    return {
      playerId: null,
      tokens: ROOM_LIMITS.burst,
      refilledAt: Date.now(),
    };
  }

  private holdsSeat(playerId: string): boolean {
    return (
      this.lobby?.players.some((p) => p.id === playerId) === true ||
      this.race?.players.some((p) => p.id === playerId) === true
    );
  }

  private raceMessage(state: RaceState): ServerMessage {
    const serverNow = Date.now();
    return state.phase === "finished"
      ? { t: "finished", state, standings: standings(state), serverNow }
      : { t: "state", state, serverNow };
  }

  private broadcastLobby(): void {
    if (!this.lobby) return;
    this.broadcast({
      t: "lobby",
      lobby: this.lobby,
      canStart: canStart(this.lobby),
      serverNow: Date.now(),
    });
  }

  // ─── Socket helpers ───

  private playerIdOf(ws: WebSocket): string | null {
    return this.attachmentOf(ws).playerId;
  }

  private hasOtherSocket(playerId: string, except: WebSocket): boolean {
    return this.ctx
      .getWebSockets()
      .some((s) => s !== except && this.playerIdOf(s) === playerId);
  }

  private deliver(ws: WebSocket, payload: string): void {
    try {
      ws.send(payload);
    } catch {
      // Socket closed between selection and send; the close handler reconciles.
    }
  }

  /** Hang up, tolerating a socket that has already gone. */
  private closeSocket(ws: WebSocket, code: number, reason: string): void {
    try {
      ws.close(code, reason);
    } catch {
      // Already gone.
    }
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    this.deliver(ws, encode(msg));
  }

  private fail(ws: WebSocket, code: ErrorCode, message: string): void {
    this.send(ws, { t: "error", code, message });
  }

  private broadcast(msg: ServerMessage): void {
    const payload = encode(msg);
    for (const socket of this.ctx.getWebSockets())
      this.deliver(socket, payload);
  }
}
