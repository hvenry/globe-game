import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { RaceView } from "@/lib/engine/types";
import type { ServerMessage } from "@/lib/race/types";
import { PLAYER_COLORS } from "@/lib/constants";

// The socket is replaced by a recorder: `push` delivers a server message the
// way the real client would, and `sent` holds what the store sent.
const socket = vi.hoisted(() => ({
  push: null as unknown as (msg: unknown) => void,
  sent: [] as unknown[],
}));
vi.mock("@/lib/race/client", () => ({
  createRoom: vi.fn(),
  RaceClient: class {
    constructor(
      _room: string,
      handlers: {
        onMessage: (m: unknown) => void;
        onStatus: (s: string, a: number) => void;
      },
    ) {
      socket.push = handlers.onMessage;
    }
    connect() {}
    send(msg: unknown) {
      socket.sent.push(msg);
    }
    close() {}
  },
}));

const { useRaceStore, raceFills } = await import("./race-store");

const NOW = 1_000_000;
const OPACITY = { claim: 0.6, attempt: 0.4 };
const ME = "me";
const THEM = "them";

function player(id: string, color: string, patch = {}) {
  return {
    id,
    name: id,
    color,
    connected: true,
    lockedUntil: null as number | null,
    attemptIds: [] as string[],
    claims: 0,
    recoveries: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    totalClaimMs: 0,
    ...patch,
  };
}

function view(patch: Partial<RaceView> = {}): RaceView {
  return {
    phase: "racing",
    config: {
      countrySetId: "all",
      countryCount: 3,
      countryWindowMs: 10_000,
      lockoutMs: 1_500,
      intermissionMs: 1_200,
      showHints: false,
    },
    currentIndex: 0,
    currentId: "100",
    shownAt: NOW,
    phaseDeadline: NOW + 10_000,
    players: [player(ME, "blue"), player(THEM, "purple")],
    results: {},
    startsAt: NOW,
    endedAt: null,
    events: [],
    nextSeq: 0,
    revealed: ["100"],
    total: 3,
    inPlay: ["100", "200", "300"],
    ...patch,
  };
}

const state = (v: RaceView): ServerMessage => ({
  t: "state",
  state: v,
  serverNow: Date.now(),
});

/** The fill the globe would paint for a country right now. */
function fillOf(countryId: string) {
  const s = useRaceStore.getState();
  return raceFills(s.race, s.playerId, s.attemptIds, OPACITY, s.pendingClaim)[
    countryId
  ];
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW + 1_000);
  useRaceStore.getState().join("ROOM", "me");
  socket.push({
    t: "welcome",
    playerId: ME,
    roomId: "ROOM",
    serverNow: Date.now(),
  });
  socket.push(state(view()));
  socket.sent.length = 0;
});

afterEach(() => {
  useRaceStore.getState().leave();
  vi.useRealTimers();
});

describe("your own claim", () => {
  test("paints in your colour the moment you click, before the server rules", () => {
    useRaceStore.getState().guess("100");
    expect(socket.sent).toEqual([{ t: "guess", countryId: "100" }]);
    expect(useRaceStore.getState().pendingClaim).toBe("100");
    expect(fillOf("100")).toEqual({
      color: PLAYER_COLORS.blue.claim,
      opacity: OPACITY.claim,
    });
  });

  test("is confirmed by the server's result", () => {
    useRaceStore.getState().guess("100");
    socket.push(
      state(
        view({
          phase: "intermission",
          results: { "100": { by: ME, elapsedMs: 900, points: 800 } },
        }),
      ),
    );
    expect(useRaceStore.getState().pendingClaim).toBeNull();
    expect(fillOf("100")).toMatchObject({ color: PLAYER_COLORS.blue.claim });
  });

  test("gives way to an opponent who reached the server first", () => {
    useRaceStore.getState().guess("100");
    socket.push(
      state(
        view({
          phase: "intermission",
          results: { "100": { by: THEM, elapsedMs: 800, points: 800 } },
        }),
      ),
    );
    expect(useRaceStore.getState().pendingClaim).toBeNull();
    expect(fillOf("100")).toMatchObject({ color: PLAYER_COLORS.purple.claim });
  });

  test("holds through a broadcast that does not settle the country", () => {
    useRaceStore.getState().guess("100");
    // An opponent's miss arrives before the server has processed our click.
    socket.push(
      state(
        view({
          players: [
            player(ME, "blue"),
            player(THEM, "purple", { attemptIds: ["200"] }),
          ],
        }),
      ),
    );
    expect(useRaceStore.getState().pendingClaim).toBe("100");
  });

  test("lapses if the server never rules on it", () => {
    useRaceStore.getState().guess("100");
    vi.advanceTimersByTime(1_499);
    expect(useRaceStore.getState().pendingClaim).toBe("100");
    vi.advanceTimersByTime(1);
    expect(useRaceStore.getState().pendingClaim).toBeNull();
    expect(fillOf("100")).toBeUndefined();
  });

  test("is not painted while you are locked out", () => {
    socket.push(
      state(
        view({
          players: [
            player(ME, "blue", { lockedUntil: Date.now() + 1_000 }),
            player(THEM, "purple"),
          ],
        }),
      ),
    );
    useRaceStore.getState().guess("100");
    expect(useRaceStore.getState().pendingClaim).toBeNull();
    // The click still goes out: the server's clock decides.
    expect(socket.sent).toEqual([{ t: "guess", countryId: "100" }]);
  });

  test("a wrong click is a miss, never a pending claim", () => {
    useRaceStore.getState().guess("200");
    expect(useRaceStore.getState().pendingClaim).toBeNull();
    expect(useRaceStore.getState().attemptIds).toEqual(["200"]);
  });

  test("clears when the next country appears", () => {
    useRaceStore.getState().guess("100");
    socket.push(
      state(
        view({ currentIndex: 1, currentId: "200", revealed: ["100", "200"] }),
      ),
    );
    expect(useRaceStore.getState().pendingClaim).toBeNull();
  });
});
