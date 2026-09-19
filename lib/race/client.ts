"use client";

/**
 * Socket transport for a race room.
 *
 * Deliberately dumb: it owns the connection and nothing else. Reconnection is
 * safe because the server broadcasts whole state rather than deltas, so a
 * resumed socket catches up from the first message it receives.
 */

import type { ClientMessage, ServerMessage } from "./types";
import { raceSocketUrl } from "./config";

const RECONNECT_DELAYS_MS = [500, 1_000, 2_000, 4_000, 8_000];

export interface RaceClientHandlers {
  onMessage: (msg: ServerMessage) => void;
  /** `attempt` counts consecutive failures; 0 once a connection succeeds. */
  onStatus: (status: "connecting" | "open" | "closed", attempt: number) => void;
}

export class RaceClient {
  private socket: WebSocket | null = null;
  private attempt = 0;
  private closedByUs = false;
  private retry: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly roomId: string,
    private readonly handlers: RaceClientHandlers,
  ) {}

  connect(): void {
    this.closedByUs = false;
    this.handlers.onStatus("connecting", this.attempt);

    const socket = new WebSocket(raceSocketUrl(this.roomId));
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.attempt = 0;
      this.handlers.onStatus("open", 0);
    });

    socket.addEventListener("message", (event) => {
      try {
        this.handlers.onMessage(JSON.parse(event.data as string) as ServerMessage);
      } catch {
        // A frame we cannot parse is the server's problem, not a reason to die.
      }
    });

    socket.addEventListener("close", () => {
      this.handlers.onStatus("closed", this.attempt);
      if (!this.closedByUs) this.scheduleReconnect();
    });

    // `error` is always followed by `close`, which already handles retrying.
    socket.addEventListener("error", () => socket.close());
  }

  private scheduleReconnect(): void {
    const delay =
      RECONNECT_DELAYS_MS[Math.min(this.attempt, RECONNECT_DELAYS_MS.length - 1)];
    this.attempt += 1;
    this.retry = setTimeout(() => this.connect(), delay);
  }

  send(msg: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    }
  }

  close(): void {
    this.closedByUs = true;
    if (this.retry) clearTimeout(this.retry);
    this.socket?.close();
    this.socket = null;
  }
}

/** Ask the server for a fresh room. Returns the short join code. */
export async function createRoom(setId?: string): Promise<string> {
  const { RACE_SERVER_URL } = await import("./config");
  const url = new URL(`${RACE_SERVER_URL}/api/rooms`);
  if (setId) url.searchParams.set("set", setId);
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    throw new Error(
      res.status === 429
        ? "Too many rooms created just now. Try again in a minute."
        : "Could not reach the race server.",
    );
  }
  const body = (await res.json()) as { roomId: string };
  return body.roomId;
}
