import { describe, expect, test } from "vitest";
import {
  createRace,
  guess,
  leave,
  nextTransitionAt,
  rejoin,
  standings,
  tick,
  timeRemainingMs,
} from "./race";
import { seededShuffle } from "./rng";
import type { RaceConfig, RacePlayer, RaceState } from "./types";

const IDS = ["100", "200", "300", "400", "500"];
const T0 = 1_000_000;
const START = T0 + 3_000;
const PLAYERS = [
  { id: "a", name: "Ada", color: "blue" },
  { id: "b", name: "Bo", color: "purple" },
];

function config(overrides: Partial<RaceConfig> = {}): RaceConfig {
  return {
    countrySetId: "all",
    countryCount: 3,
    countryWindowMs: 10_000,
    lockoutMs: 1_500,
    intermissionMs: 1_200,
    ...overrides,
  };
}

function newRace(overrides: Partial<RaceConfig> = {}, seed = 42): RaceState {
  return createRace(IDS, config(overrides), seed, PLAYERS, START);
}

/** A race with the first country showing (countdown just ended). */
function racing(overrides: Partial<RaceConfig> = {}): RaceState {
  return tick(newRace(overrides), START);
}

function player(state: RaceState, id: string): RacePlayer {
  return state.players.find((p) => p.id === id)!;
}

describe("creation", () => {
  test("order is the first N of the seeded shuffle", () => {
    const s = newRace();
    expect(s.order).toEqual(seededShuffle(IDS, 42).slice(0, 3));
    expect(newRace({}, 42).order).toEqual(s.order);
  });

  test("country count clamps to the set size", () => {
    expect(newRace({ countryCount: 99 }).order).toHaveLength(IDS.length);
    expect(newRace({ countryCount: 0 }).order).toHaveLength(0);
  });

  test("starts in countdown with no active country", () => {
    const s = newRace();
    expect(s.phase).toBe("countdown");
    expect(s.currentIndex).toBe(-1);
    expect(s.currentId).toBeNull();
    expect(s.shownAt).toBeNull();
    expect(s.phaseDeadline).toBe(START);
    expect(nextTransitionAt(s)).toBe(START);
    expect(s.results).toEqual({});
  });

  test("players start connected, free, and scoreless", () => {
    const s = newRace();
    expect(s.players).toEqual([
      {
        id: "a",
        name: "Ada",
        color: "blue",
        connected: true,
        lockedUntil: null,
        attemptIds: [],
        claims: 0,
        totalClaimMs: 0,
      },
      {
        id: "b",
        name: "Bo",
        color: "purple",
        connected: true,
        lockedUntil: null,
        attemptIds: [],
        claims: 0,
        totalClaimMs: 0,
      },
    ]);
  });
});

describe("tick", () => {
  test("is a no-op before the countdown ends", () => {
    const s = newRace();
    expect(tick(s, START - 1)).toBe(s);
  });

  test("countdown end reveals the first country", () => {
    const s = racing();
    expect(s.phase).toBe("racing");
    expect(s.currentIndex).toBe(0);
    expect(s.currentId).toBe(s.order[0]);
    expect(s.shownAt).toBe(START);
    expect(s.phaseDeadline).toBe(START + 10_000);
  });

  test("is a no-op mid-window", () => {
    const s = racing();
    expect(tick(s, START + 9_999)).toBe(s);
  });

  test("expired window resolves unclaimed and enters intermission", () => {
    const s0 = racing();
    const s1 = tick(s0, START + 10_000);
    expect(s1.phase).toBe("intermission");
    expect(s1.currentId).toBe(s0.order[0]);
    expect(s1.results[s0.order[0]]).toEqual({ by: null, elapsedMs: null });
    expect(s1.phaseDeadline).toBe(START + 11_200);
  });

  test("intermission end reveals the next country", () => {
    const s0 = racing();
    const s1 = tick(s0, START + 10_000);
    const s2 = tick(s1, START + 11_200);
    expect(s2.phase).toBe("racing");
    expect(s2.currentIndex).toBe(1);
    expect(s2.currentId).toBe(s0.order[1]);
    expect(s2.shownAt).toBe(START + 11_200);
    expect(s2.phaseDeadline).toBe(START + 21_200);
  });

  test("the last intermission finishes the race", () => {
    let s = racing();
    let now = START;
    for (let i = 0; i < 3; i++) {
      now += 10_000;
      s = tick(s, now); // window expires
      now += 1_200;
      s = tick(s, now); // intermission ends
    }
    expect(s.phase).toBe("finished");
    expect(s.endedAt).toBe(now);
    expect(s.phaseDeadline).toBeNull();
    expect(nextTransitionAt(s)).toBeNull();
    expect(timeRemainingMs(s, now)).toBeNull();
    expect(Object.keys(s.results)).toHaveLength(3);
    expect(tick(s, now + 99_999)).toBe(s);
  });

  test("a late tick catches up from the present instead of cascading", () => {
    const s0 = racing();
    const late = START + 50_000;
    const s1 = tick(s0, late);
    expect(s1.phase).toBe("intermission");
    expect(Object.keys(s1.results)).toEqual([s0.order[0]]);
    expect(s1.phaseDeadline).toBe(late + 1_200);
  });

  test("zero intermission rolls straight into the next country", () => {
    const s0 = racing({ intermissionMs: 0 });
    const s1 = tick(s0, START + 10_000);
    expect(s1.phase).toBe("racing");
    expect(s1.currentIndex).toBe(1);
    expect(s1.results[s0.order[0]]).toEqual({ by: null, elapsedMs: null });
  });

  test("an empty order finishes as soon as the countdown ends", () => {
    const s = tick(newRace({ countryCount: 0 }), START);
    expect(s.phase).toBe("finished");
    expect(s.endedAt).toBe(START);
  });
});

describe("claims", () => {
  test("guesses during countdown are ignored", () => {
    const s = newRace();
    expect(guess(s, "a", s.order[0], START - 1)).toBe(s);
  });

  test("a correct click claims the country and enters intermission", () => {
    const s0 = racing();
    const s1 = guess(s0, "a", s0.currentId!, START + 2_500);
    expect(s1.phase).toBe("intermission");
    expect(s1.currentId).toBe(s0.currentId);
    expect(s1.results[s0.currentId!]).toEqual({ by: "a", elapsedMs: 2_500 });
    expect(player(s1, "a")).toMatchObject({ claims: 1, totalClaimMs: 2_500, lockedUntil: null });
    expect(player(s1, "b")).toEqual(player(s0, "b"));
    expect(s1.phaseDeadline).toBe(START + 3_700);
  });

  test("the country cannot be claimed again during intermission", () => {
    const s0 = racing();
    const s1 = guess(s0, "a", s0.currentId!, START + 2_500);
    expect(guess(s1, "b", s0.currentId!, START + 2_600)).toBe(s1);
    expect(player(s1, "b").claims).toBe(0);
  });

  test("total claim time accumulates across claims", () => {
    const s0 = racing();
    const s1 = guess(s0, "a", s0.order[0], START + 1_000);
    const s2 = tick(s1, START + 2_200);
    const s3 = guess(s2, "a", s0.order[1], START + 5_200);
    expect(player(s3, "a")).toMatchObject({ claims: 2, totalClaimMs: 4_000 });
  });

  test("clicking an already-resolved country is a free click", () => {
    const s0 = racing();
    const s1 = guess(s0, "a", s0.order[0], START + 1_000);
    const s2 = tick(s1, START + 2_200);
    expect(guess(s2, "b", s0.order[0], START + 2_300)).toBe(s2);
  });

  test("unknown and departed players are ignored", () => {
    const s0 = racing();
    expect(guess(s0, "zed", s0.currentId!, START + 1)).toBe(s0);
    const s1 = leave(s0, "a", START + 1);
    expect(guess(s1, "a", s0.currentId!, START + 2)).toBe(s1);
  });

  test("a guess after the window expired is judged against the settled state", () => {
    const s0 = racing();
    const s1 = guess(s0, "a", s0.order[0], START + 10_001);
    expect(s1).not.toBe(s0);
    expect(s1.phase).toBe("intermission");
    expect(s1.results[s0.order[0]]).toEqual({ by: null, elapsedMs: null });
    expect(player(s1, "a").claims).toBe(0);
  });

  test("a guess after a missed reveal applies to the next country", () => {
    const s0 = racing();
    const s1 = tick(s0, START + 10_000); // intermission until START + 11_200
    const s2 = guess(s1, "a", s0.order[1], START + 11_500);
    expect(s2.phase).toBe("intermission");
    expect(s2.currentIndex).toBe(1);
    expect(s2.shownAt).toBe(START + 11_500);
    expect(s2.results[s0.order[1]]).toEqual({ by: "a", elapsedMs: 0 });
  });
});

describe("lockout", () => {
  test("a wrong click locks the player and changes nothing else", () => {
    const s0 = racing();
    const s1 = guess(s0, "a", s0.order[1], START + 1_000);
    expect(s1.phase).toBe("racing");
    expect(s1.results).toEqual({});
    expect(player(s1, "a").lockedUntil).toBe(START + 2_500);
    expect(player(s1, "b")).toEqual(player(s0, "b"));
  });

  test("a wrong click is recorded on the player, for everyone to see", () => {
    const s0 = racing();
    const s1 = guess(s0, "a", s0.order[1], START + 1_000);
    expect(player(s1, "a").attemptIds).toEqual([s0.order[1]]);
    expect(player(s1, "b").attemptIds).toEqual([]);
  });

  test("a second wrong click on the same country is not recorded twice", () => {
    const s0 = racing();
    let s = guess(s0, "a", s0.order[1], START + 1_000);
    // Past the lockout, so the click is actually considered again.
    s = guess(s, "a", s0.order[1], START + 3_000);
    expect(player(s, "a").attemptIds).toEqual([s0.order[1]]);
  });

  test("misses clear when the next country appears", () => {
    const s0 = racing();
    let s = guess(s0, "a", s0.order[1], START + 1_000);
    // Claim the current country, then run out the intermission.
    s = guess(s, "b", s.currentId!, START + 2_000);
    s = tick(s, START + 2_000 + s.config.intermissionMs);
    expect(s.currentIndex).toBe(1);
    expect(player(s, "a").attemptIds).toEqual([]);
  });

  test("clicks while locked are ignored and do not extend the lockout", () => {
    const s0 = racing();
    const s1 = guess(s0, "a", s0.order[1], START + 1_000);
    expect(guess(s1, "a", s0.order[2], START + 1_500)).toBe(s1);
    expect(guess(s1, "a", s0.currentId!, START + 2_499)).toBe(s1);
  });

  test("the player can claim once the lockout expires", () => {
    const s0 = racing();
    const s1 = guess(s0, "a", s0.order[1], START + 1_000);
    const s2 = guess(s1, "a", s0.currentId!, START + 2_500);
    expect(s2.results[s0.currentId!]).toEqual({ by: "a", elapsedMs: 2_500 });
  });

  test("one player's lockout does not affect the other", () => {
    const s0 = racing();
    const s1 = guess(s0, "a", s0.order[1], START + 1_000);
    const s2 = guess(s1, "b", s0.currentId!, START + 1_100);
    expect(s2.results[s0.currentId!]).toEqual({ by: "b", elapsedMs: 1_100 });
  });

  test("lockout carries across the rollover to the next country", () => {
    const s0 = racing();
    const s1 = guess(s0, "a", s0.order[1], START + 9_500); // locked until START + 11_000
    const s2 = guess(s1, "b", s0.order[0], START + 9_600); // intermission until START + 10_800
    const s3 = tick(s2, START + 10_800);
    expect(s3.currentId).toBe(s0.order[1]);
    expect(guess(s3, "a", s0.order[1], START + 10_900)).toBe(s3);
    const s4 = guess(s3, "a", s0.order[1], START + 11_000);
    expect(s4.results[s0.order[1]]).toEqual({ by: "a", elapsedMs: 200 });
  });
});

describe("leave and rejoin", () => {
  test("leaving marks the player disconnected and the race continues", () => {
    const s0 = racing();
    const s1 = leave(s0, "a", START + 1);
    expect(s1.phase).toBe("racing");
    expect(player(s1, "a").connected).toBe(false);
    expect(player(s1, "b").connected).toBe(true);
  });

  test("a departed player keeps their claims", () => {
    const s0 = racing();
    const s1 = guess(s0, "a", s0.order[0], START + 1_000);
    const s2 = leave(s1, "a", START + 1_100);
    expect(player(s2, "a").claims).toBe(1);
    expect(s2.results[s0.order[0]].by).toBe("a");
  });

  test("rejoining restores the player", () => {
    const s0 = racing();
    const s1 = leave(s0, "a", START + 1);
    const s2 = rejoin(s1, "a");
    expect(player(s2, "a").connected).toBe(true);
    const s3 = guess(s2, "a", s0.currentId!, START + 500);
    expect(s3.results[s0.currentId!].by).toBe("a");
  });

  test("the race finishes when the last connected player leaves", () => {
    const s0 = racing();
    const s1 = leave(s0, "a", START + 1);
    const s2 = leave(s1, "b", START + 2);
    expect(s2.phase).toBe("finished");
    expect(s2.endedAt).toBe(START + 2);
    expect(s2.phaseDeadline).toBeNull();
  });

  test("redundant leave and rejoin calls are no-ops", () => {
    const s0 = racing();
    expect(leave(s0, "zed", START)).toBe(s0);
    expect(rejoin(s0, "a")).toBe(s0);
    const s1 = leave(s0, "a", START + 1);
    expect(leave(s1, "a", START + 2)).toBe(s1);
    const done = leave(s1, "b", START + 3);
    expect(rejoin(done, "a")).toBe(done);
    expect(leave(done, "a", START + 4)).toBe(done);
  });
});

describe("standings", () => {
  function withPlayers(players: Partial<RacePlayer>[]): RaceState {
    const s = newRace();
    return {
      ...s,
      players: players.map((p, i) => ({ ...s.players[0], id: String(i), ...p })),
    };
  }

  test("orders by claims descending", () => {
    const s = withPlayers([{ id: "x", claims: 1 }, { id: "y", claims: 3 }, { id: "z", claims: 2 }]);
    expect(standings(s).map((p) => p.id)).toEqual(["y", "z", "x"]);
  });

  test("breaks ties by lower total claim time", () => {
    const s = withPlayers([
      { id: "slow", claims: 2, totalClaimMs: 9_000 },
      { id: "fast", claims: 2, totalClaimMs: 4_000 },
    ]);
    expect(standings(s).map((p) => p.id)).toEqual(["fast", "slow"]);
  });

  test("fully tied players order by id and the input is not mutated", () => {
    const s = withPlayers([{ id: "b", claims: 1 }, { id: "a", claims: 1 }]);
    const sorted = standings(s);
    expect(sorted.map((p) => p.id)).toEqual(["a", "b"]);
    expect(s.players.map((p) => p.id)).toEqual(["b", "a"]);
  });
});

describe("timeRemainingMs", () => {
  test("counts down to the phase deadline and floors at zero", () => {
    const s0 = newRace();
    expect(timeRemainingMs(s0, T0)).toBe(3_000);
    const s1 = racing();
    expect(timeRemainingMs(s1, START + 4_000)).toBe(6_000);
    expect(timeRemainingMs(s1, START + 20_000)).toBe(0);
  });
});
