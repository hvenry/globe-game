import { describe, expect, test } from "vitest";
import {
  createRace,
  end,
  guess,
  isDraw,
  leave,
  nextTransitionAt,
  publicView,
  rejoin,
  scoreClaim,
  standings,
  tick,
  timeRemainingMs,
} from "./race";
import { seededShuffle } from "./rng";
import {
  RACE_EVENT_LOG,
  type RaceConfig,
  type RacePlayer,
  type RaceState,
} from "./types";
import { RACE_SCORING } from "../constants";

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
    showHints: false,
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

/** A race whose roster is exactly these players, for ranking tests. */
function withPlayers(players: Partial<RacePlayer>[]): RaceState {
  const s = newRace();
  return {
    ...s,
    players: players.map((p, i) => ({ ...s.players[0], id: String(i), ...p })),
  };
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
        recoveries: 0,
        score: 0,
        streak: 0,
        bestStreak: 0,
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
        recoveries: 0,
        score: 0,
        streak: 0,
        bestStreak: 0,
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

  test("expired window enters reveal with no deadline, and logs it", () => {
    const s0 = racing();
    const s1 = tick(s0, START + 10_000);
    expect(s1.phase).toBe("reveal");
    expect(s1.currentId).toBe(s0.order[0]);
    expect(s1.results[s0.order[0]]).toBeUndefined();
    expect(s1.phaseDeadline).toBeNull();
    expect(s1.events.at(-1)).toMatchObject({
      type: "expired",
      countryId: s0.order[0],
    });
  });

  test("reveal waits for a click however long it takes", () => {
    const s1 = tick(racing(), START + 10_000);
    expect(tick(s1, START + 999_999)).toBe(s1);
  });

  test("intermission end reveals the next country", () => {
    const s0 = racing();
    const s1 = guess(
      tick(s0, START + 10_000),
      "a",
      s0.order[0],
      START + 10_500,
    );
    expect(s1.phase).toBe("intermission");
    const s2 = tick(s1, START + 10_500 + 1_200);
    expect(s2.phase).toBe("racing");
    expect(s2.currentIndex).toBe(1);
    expect(s2.currentId).toBe(s0.order[1]);
    expect(s2.shownAt).toBe(START + 11_700);
    expect(s2.phaseDeadline).toBe(START + 21_700);
  });

  test("the last intermission finishes the race", () => {
    let s = racing();
    let now = START;
    for (let i = 0; i < 3; i++) {
      now += 10_000;
      s = tick(s, now); // window expires into reveal
      now += 500;
      s = guess(s, "a", s.currentId!, now); // recovered
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

  test("a late tick lands in reveal rather than cascading through the schedule", () => {
    const s0 = racing();
    const late = START + 50_000;
    const s1 = tick(s0, late);
    expect(s1.phase).toBe("reveal");
    expect(s1.currentIndex).toBe(0);
    expect(Object.keys(s1.results)).toEqual([]);
  });

  test("zero intermission rolls straight into the next country after a recovery", () => {
    const s0 = racing({ intermissionMs: 0 });
    // The click settles the country; the server's next tick, due at once,
    // rolls the zero-length intermission over.
    const s1 = tick(
      guess(tick(s0, START + 10_000), "b", s0.order[0], START + 10_100),
      START + 10_100,
    );
    expect(s1.phase).toBe("racing");
    expect(s1.currentIndex).toBe(1);
    expect(s1.results[s0.order[0]]).toEqual({
      by: "b",
      elapsedMs: 10_100,
      recovered: true,
      points: RACE_SCORING.recovery,
    });
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
    expect(s1.results[s0.currentId!]).toMatchObject({
      by: "a",
      elapsedMs: 2_500,
    });
    expect(s1.results[s0.currentId!].points).toBeGreaterThan(0);
    expect(player(s1, "a")).toMatchObject({
      claims: 1,
      totalClaimMs: 2_500,
      lockedUntil: null,
    });
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

  test("a correct guess after the window expired is a recovery, not a claim", () => {
    const s0 = racing();
    const s1 = guess(s0, "a", s0.order[0], START + 10_001);
    expect(s1.phase).toBe("intermission");
    expect(s1.results[s0.order[0]]).toEqual({
      by: "a",
      elapsedMs: 10_001,
      recovered: true,
      points: RACE_SCORING.recovery,
    });
    expect(player(s1, "a").claims).toBe(0);
    expect(player(s1, "a").recoveries).toBe(1);
    expect(player(s1, "a").score).toBe(RACE_SCORING.recovery);
    expect(s1.events.at(-1)).toMatchObject({ type: "recovery", playerId: "a" });
  });

  test("a wrong click during reveal locks the player like any other miss", () => {
    const s0 = racing();
    const s1 = tick(s0, START + 10_000);
    const s2 = guess(s1, "a", s0.order[3], START + 10_100);
    expect(s2.phase).toBe("reveal");
    expect(player(s2, "a").lockedUntil).toBe(START + 11_600);
    expect(guess(s2, "a", s0.order[0], START + 10_200)).toBe(s2);
  });

  test("a click cannot claim a country its own settle just revealed", () => {
    // Intermission ends at START + 2_200, but the server has not ticked yet:
    // a click arriving now reaches a country no player has been shown.
    const s0 = racing();
    const s1 = guess(s0, "a", s0.order[0], START + 1_000);
    const s2 = guess(s1, "b", s0.order[1], START + 2_250);
    expect(s2.phase).toBe("racing");
    expect(s2.currentId).toBe(s0.order[1]);
    expect(s2.results[s0.order[1]]).toBeUndefined();
    expect(player(s2, "b")).toEqual(player(s1, "b"));
  });

  test("a click cannot claim the first country as the countdown settles", () => {
    const s = newRace();
    const next = guess(s, "a", s.order[0], START + 1);
    expect(next.phase).toBe("racing");
    expect(next.results).toEqual({});
  });

  test("only the first click recovers; the country is then settled", () => {
    const s0 = racing();
    const s1 = guess(
      tick(s0, START + 10_000),
      "b",
      s0.order[0],
      START + 10_100,
    );
    const s2 = guess(s1, "a", s0.order[0], START + 10_200);
    expect(s2).toBe(s1);
    expect(player(s2, "b").recoveries).toBe(1);
    expect(player(s2, "a").recoveries).toBe(0);
  });
});

describe("scoring", () => {
  const first = (s: RaceState) => s.order[0];

  test("an instant clean claim earns claim plus full speed plus accuracy", () => {
    const s0 = racing();
    const s1 = guess(s0, "a", first(s0), START);
    const expected =
      RACE_SCORING.claim + RACE_SCORING.speedMax + RACE_SCORING.accuracy;
    expect(player(s1, "a").score).toBe(expected);
    expect(s1.events.at(-1)).toMatchObject({
      type: "claim",
      playerId: "a",
      points: expected,
      breakdown: {
        claim: RACE_SCORING.claim,
        speed: RACE_SCORING.speedMax,
        accuracy: RACE_SCORING.accuracy,
        combo: 0,
        recovery: 0,
      },
      streak: 1,
    });
  });

  test("speed scales down with the window and hits zero at its end", () => {
    const s0 = racing();
    const half = guess(s0, "a", first(s0), START + 5_000);
    expect(half.events.at(-1)).toMatchObject({
      breakdown: { speed: RACE_SCORING.speedMax / 2 },
    });
    const end = guess(s0, "a", first(s0), START + 9_999);
    expect(
      (end.events.at(-1) as { breakdown: { speed: number } }).breakdown.speed,
    ).toBe(0);
  });

  test("a wrong click on the way forfeits the accuracy bonus", () => {
    const s0 = racing();
    const s1 = guess(s0, "a", s0.order[2], START + 100);
    const s2 = guess(s1, "a", first(s0), START + 2_000);
    expect(s2.events.at(-1)).toMatchObject({ breakdown: { accuracy: 0 } });
  });

  test("combo grows per consecutive claim, caps, and another player's claim breaks it", () => {
    let s = racing();
    let now = START;
    const step = () => {
      now += 500;
      s = tick(s, now + 1_200) as RaceState; // through intermission
      now += 1_200;
    };
    s = guess(s, "a", s.currentId!, now); // streak 1, combo 0
    step();
    s = guess(s, "a", s.currentId!, now); // streak 2, combo one step
    expect(s.events.at(-1)).toMatchObject({
      streak: 2,
      breakdown: { combo: RACE_SCORING.comboStep },
    });
    step();
    s = guess(s, "b", s.currentId!, now); // b claims: a's streak ends
    expect(player(s, "a").streak).toBe(0);
    expect(player(s, "a").bestStreak).toBe(2);
    expect(player(s, "b").streak).toBe(1);
  });

  test("combo never exceeds its cap", () => {
    const s0 = racing();
    const long = { ...player(s0, "a"), streak: 99 };
    expect(scoreClaim(s0, long, 0).breakdown.combo).toBe(RACE_SCORING.comboMax);
  });

  test("an expired window breaks every streak", () => {
    let s = guess(racing(), "a", racing().order[0], START);
    s = tick(s, START + 1_200); // next country
    s = tick(s, START + 1_200 + 10_000); // nobody got it
    expect(s.phase).toBe("reveal");
    expect(player(s, "a").streak).toBe(0);
    expect(player(s, "a").bestStreak).toBe(1);
  });

  test("the event log keeps only the most recent entries but never reuses a seq", () => {
    let s: RaceState = {
      ...racing(),
      order: Array.from({ length: 30 }, (_, i) => String(i)),
    };
    let now = START;
    for (let i = 0; i < 30; i++) {
      s = guess(s, "a", s.currentId!, now);
      now += 1_200;
      s = tick(s, now);
    }
    expect(s.events.length).toBe(RACE_EVENT_LOG);
    expect(s.events[0].seq).toBe(30 - RACE_EVENT_LOG);
    expect(s.nextSeq).toBe(30);
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
    expect(s2.results[s0.currentId!]).toMatchObject({
      by: "a",
      elapsedMs: 2_500,
    });
    expect(s2.results[s0.currentId!].points).toBeGreaterThan(0);
  });

  test("one player's lockout does not affect the other", () => {
    const s0 = racing();
    const s1 = guess(s0, "a", s0.order[1], START + 1_000);
    const s2 = guess(s1, "b", s0.currentId!, START + 1_100);
    expect(s2.results[s0.currentId!]).toMatchObject({
      by: "b",
      elapsedMs: 1_100,
    });
    expect(s2.results[s0.currentId!].points).toBeGreaterThan(0);
  });

  test("lockout carries across the rollover to the next country", () => {
    const s0 = racing();
    const s1 = guess(s0, "a", s0.order[1], START + 9_500); // locked until START + 11_000
    const s2 = guess(s1, "b", s0.order[0], START + 9_600); // intermission until START + 10_800
    const s3 = tick(s2, START + 10_800);
    expect(s3.currentId).toBe(s0.order[1]);
    expect(guess(s3, "a", s0.order[1], START + 10_900)).toBe(s3);
    const s4 = guess(s3, "a", s0.order[1], START + 11_000);
    expect(s4.results[s0.order[1]]).toMatchObject({ by: "a", elapsedMs: 200 });
    expect(s4.results[s0.order[1]].points).toBeGreaterThan(0);
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
  test("orders by score descending", () => {
    const s = withPlayers([
      { id: "x", score: 100 },
      { id: "y", score: 300 },
      { id: "z", score: 200 },
    ]);
    expect(standings(s).map((p) => p.id)).toEqual(["y", "z", "x"]);
  });

  test("breaks a score tie by claims, then by lower total claim time", () => {
    const s = withPlayers([
      { id: "slow", claims: 2, totalClaimMs: 9_000 },
      { id: "fast", claims: 2, totalClaimMs: 4_000 },
      { id: "fewer", claims: 1, totalClaimMs: 1_000 },
    ]);
    expect(standings(s).map((p) => p.id)).toEqual(["fast", "slow", "fewer"]);
  });

  test("breaks ties by lower total claim time", () => {
    const s = withPlayers([
      { id: "slow", claims: 2, totalClaimMs: 9_000 },
      { id: "fast", claims: 2, totalClaimMs: 4_000 },
    ]);
    expect(standings(s).map((p) => p.id)).toEqual(["fast", "slow"]);
  });

  test("fully tied players order by id and the input is not mutated", () => {
    const s = withPlayers([
      { id: "b", claims: 1 },
      { id: "a", claims: 1 },
    ]);
    const sorted = standings(s);
    expect(sorted.map((p) => p.id)).toEqual(["a", "b"]);
    expect(s.players.map((p) => p.id)).toEqual(["b", "a"]);
  });
});

describe("isDraw", () => {
  test("level on score, claims and claim time is a draw", () => {
    const s = withPlayers([
      { id: "b", score: 900, claims: 2, totalClaimMs: 4_000 },
      { id: "a", score: 900, claims: 2, totalClaimMs: 4_000 },
    ]);
    expect(isDraw(standings(s))).toBe(true);
  });

  test("any tiebreak that separates the top two is not a draw", () => {
    const base = { score: 900, claims: 2, totalClaimMs: 4_000 };
    const byScore = withPlayers([
      { ...base, id: "a" },
      { ...base, id: "b", score: 800 },
    ]);
    const byClaims = withPlayers([
      { ...base, id: "a" },
      { ...base, id: "b", claims: 1 },
    ]);
    const byTime = withPlayers([
      { ...base, id: "a" },
      { ...base, id: "b", totalClaimMs: 9_000 },
    ]);
    expect(isDraw(standings(byScore))).toBe(false);
    expect(isDraw(standings(byClaims))).toBe(false);
    expect(isDraw(standings(byTime))).toBe(false);
  });

  test("a tie behind the leader is not a draw", () => {
    const s = withPlayers([
      { id: "a", score: 900 },
      { id: "b", score: 800 },
      { id: "c", score: 800 },
    ]);
    expect(isDraw(standings(s))).toBe(false);
  });

  test("one player, or none, is never a draw", () => {
    expect(isDraw(standings(withPlayers([{ id: "a" }])))).toBe(false);
    expect(isDraw([])).toBe(false);
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

describe("end", () => {
  test("finishes a running race at once, keeping what was played", () => {
    const s0 = guess(racing(), "a", racing().order[0], START + 1_000);
    const s1 = end(s0, START + 5_000);
    expect(s1.phase).toBe("finished");
    expect(s1.endedAt).toBe(START + 5_000);
    expect(s1.phaseDeadline).toBeNull();
    expect(Object.keys(s1.results)).toEqual([s0.order[0]]);
    expect(player(s1, "a").claims).toBe(1);
  });

  test("is a no-op once finished, and ends a reveal too", () => {
    const revealing = tick(racing(), START + 10_000);
    const ended = end(revealing, START + 20_000);
    expect(ended.phase).toBe("finished");
    expect(end(ended, START + 30_000)).toBe(ended);
  });
});

describe("publicView", () => {
  test("shows only the countries revealed so far, and no seed", () => {
    const s0 = newRace({ countryCount: 4 });
    const countdown = publicView(s0);
    expect(countdown.revealed).toEqual([]);
    expect(countdown.total).toBe(4);
    expect(countdown).not.toHaveProperty("order");
    expect(countdown).not.toHaveProperty("seed");

    const s1 = tick(s0, START);
    expect(publicView(s1).revealed).toEqual([s0.order[0]]);
    const s2 = tick(guess(s1, "a", s0.order[0], START + 1_000), START + 2_200);
    expect(publicView(s2).revealed).toEqual(s0.order.slice(0, 2));
  });

  test("lists what is in play sorted, so it gives nothing of the order away", () => {
    const s = newRace({ countryCount: 4 });
    expect(publicView(s).inPlay).toEqual([...s.order].sort());
  });

  test("reveals the whole order once the race is finished", () => {
    const s = end(racing({ countryCount: 4 }), START + 1_000);
    expect(publicView(s).revealed).toEqual(s.order);
  });

  test("keeps everything else as the engine has it", () => {
    const s = guess(racing(), "a", racing().order[0], START + 1_000);
    const view = publicView(s);
    expect(view.players).toBe(s.players);
    expect(view.results).toBe(s.results);
    expect(view.currentId).toBe(s.currentId);
    expect(view.phaseDeadline).toBe(s.phaseDeadline);
  });
});
