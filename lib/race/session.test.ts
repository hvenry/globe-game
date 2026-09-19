import { describe, expect, it } from "vitest";
import { rememberPlayerId, rememberedPlayerId, type KeyValueStore } from "./session";

function fakeStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

describe("race session credential", () => {
  it("returns undefined for a room it has never seen", () => {
    expect(rememberedPlayerId("ABC123", fakeStore())).toBeUndefined();
  });

  it("round-trips a player id for the room it was minted in", () => {
    const store = fakeStore();
    rememberPlayerId("ABC123", "p1", store);
    expect(rememberedPlayerId("ABC123", store)).toBe("p1");
  });

  it("never offers one room's id to another room", () => {
    const store = fakeStore();
    rememberPlayerId("ABC123", "p1", store);
    expect(rememberedPlayerId("XYZ789", store)).toBeUndefined();
  });

  it("survives a storage that throws", () => {
    const broken: KeyValueStore = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
    };
    expect(() => rememberPlayerId("ABC123", "p1", broken)).not.toThrow();
    expect(rememberedPlayerId("ABC123", broken)).toBeUndefined();
  });

  it("uses per-tab session storage, not browser-wide local storage", () => {
    // Two tabs must be two players; localStorage would merge them into one seat.
    const local = fakeStore();
    const session = fakeStore();
    (globalThis as { localStorage?: unknown }).localStorage = local;
    (globalThis as { sessionStorage?: unknown }).sessionStorage = session;
    try {
      rememberPlayerId("ABC123", "p1");
      expect(session.data.size).toBe(1);
      expect(local.data.size).toBe(0);
    } finally {
      delete (globalThis as { localStorage?: unknown }).localStorage;
      delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    }
  });
});
