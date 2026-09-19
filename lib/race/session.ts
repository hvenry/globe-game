/**
 * The reconnect credential for a race seat.
 *
 * The server hands every connection a `playerId`; sending it back on the next
 * `join` re-claims the same seat. Where it is kept decides what "the same
 * player" means:
 *
 * - `sessionStorage`, not `localStorage`: a second tab in the same browser is
 *   a second player. With one browser-wide key the second tab would present
 *   the first tab's id and take over its seat, so two people testing on one
 *   machine could never get a two-player lobby.
 * - Keyed by room, so an id minted for one room is never offered to another.
 *
 * A reload keeps `sessionStorage`, so a refresh still lands in the same seat.
 */

const PREFIX = "globe-race-player-id:";

/** The subset of `Storage` used here, so tests need no DOM. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function storage(): KeyValueStore | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function rememberedPlayerId(
  roomId: string,
  store: KeyValueStore | null = storage(),
): string | undefined {
  try {
    return store?.getItem(PREFIX + roomId) ?? undefined;
  } catch {
    return undefined;
  }
}

export function rememberPlayerId(
  roomId: string,
  playerId: string,
  store: KeyValueStore | null = storage(),
): void {
  try {
    store?.setItem(PREFIX + roomId, playerId);
  } catch {
    // Storage blocked: a reconnect degrades to a fresh seat, which is survivable.
  }
}
