import { describe, expect, test } from "vitest";
import {
  advance,
  createSoloGame,
  elapsedMs,
  expireTimer,
  forfeit,
  guess,
  pause,
  resume,
  skip,
  timeRemainingMs,
} from "./solo";
import { seededShuffle } from "./rng";
import type { SoloConfig } from "./types";

const IDS = ["100", "200", "300", "400", "500"];
const T0 = 1_000_000;

function config(overrides: Partial<SoloConfig> = {}): SoloConfig {
  return {
    countrySetId: "all",
    expertMode: false,
    timerLimitMs: null,
    maxTries: 3,
    ...overrides,
  };
}

function newGame(overrides: Partial<SoloConfig> = {}, seed = 42) {
  return createSoloGame(IDS, config(overrides), seed, T0);
}

describe("seeded shuffle", () => {
  test("same seed produces the same order", () => {
    expect(seededShuffle(IDS, 7)).toEqual(seededShuffle(IDS, 7));
  });

  test("different seeds produce different orders", () => {
    expect(seededShuffle(IDS, 1)).not.toEqual(seededShuffle(IDS, 2));
  });

  test("shuffle preserves the id set", () => {
    expect([...seededShuffle(IDS, 9)].sort()).toEqual([...IDS].sort());
  });
});

describe("correct guesses", () => {
  test("first-try guess resolves perfect with full points", () => {
    const s0 = newGame();
    const s1 = guess(s0, s0.currentId!, T0);
    expect(s1.phase).toBe("feedback");
    expect(s1.resolved[s0.currentId!]).toBe("perfect");
    expect(s1.totalPoints).toBe(1);
    expect(s1.questionsAnswered).toBe(1);
    expect(s1.questionsCorrect).toBe(1);
    expect(s1.unanswered).not.toContain(s0.currentId!);
  });

  test("guess after one miss resolves almost with partial points", () => {
    const s0 = newGame();
    const wrong = s0.unanswered.find((id) => id !== s0.currentId)!;
    const s1 = guess(s0, wrong, T0);
    expect(s1.triesRemaining).toBe(2);
    expect(s1.wrongGuessIds).toEqual([wrong]);

    const s2 = guess(s1, s1.currentId!, T0);
    expect(s2.resolved[s1.currentId!]).toBe("almost");
    expect(s2.totalPoints).toBeCloseTo(2 / 3);
  });

  test("advance moves to the next question and resets tries", () => {
    const s0 = newGame();
    const s1 = guess(s0, s0.currentId!, T0);
    const s2 = advance(s1, T0);
    expect(s2.phase).toBe("playing");
    expect(s2.currentId).not.toBe(s0.currentId);
    expect(s2.triesRemaining).toBe(3);
    expect(s2.wrongGuessIds).toEqual([]);
  });

  test("resolving the final country ends the game", () => {
    let s = newGame();
    while (s.phase !== "gameover") {
      s = guess(s, s.currentId!, T0);
      s = advance(s, T0);
    }
    expect(s.questionsAnswered).toBe(IDS.length);
    expect(s.totalPoints).toBe(IDS.length);
  });
});

describe("free clicks", () => {
  test("clicking an already-resolved country is a no-op", () => {
    const s0 = newGame();
    const first = s0.currentId!;
    const s1 = advance(guess(s0, first, T0), T0);
    expect(guess(s1, first, T0)).toBe(s1);
  });

  test("re-clicking a wrong guess is a no-op", () => {
    const s0 = newGame();
    const wrong = s0.unanswered.find((id) => id !== s0.currentId)!;
    const s1 = guess(s0, wrong, T0);
    expect(guess(s1, wrong, T0)).toBe(s1);
  });
});

describe("failure and mustclick", () => {
  function failCurrent(s = newGame()) {
    const wrongs = s.unanswered.filter((id) => id !== s.currentId).slice(0, 3);
    for (const w of wrongs) s = guess(s, w, T0);
    return s;
  }

  test("exhausting tries resolves failed immediately and enters mustclick", () => {
    const s0 = newGame();
    const current = s0.currentId!;
    const s = failCurrent(s0);
    expect(s.phase).toBe("mustclick");
    expect(s.resolved[current]).toBe("failed");
    expect(s.questionsAnswered).toBe(1);
    expect(s.questionsCorrect).toBe(0);
    expect(s.unanswered).not.toContain(current);
    expect(s.currentId).toBe(current); // still the mustclick target
  });

  test("wrong clicks during mustclick are ignored; correct click advances", () => {
    const s = failCurrent();
    const other = s.unanswered.find((id) => id !== s.currentId)!;
    expect(guess(s, other, T0)).toBe(s);

    const advanced = guess(s, s.currentId!, T0);
    expect(advanced.phase).toBe("playing");
    expect(advanced.currentId).not.toBe(s.currentId);
  });

  test("forfeiting during mustclick keeps the failed resolution", () => {
    const s0 = newGame();
    const current = s0.currentId!;
    const s = forfeit(failCurrent(s0), T0 + 500);
    expect(s.phase).toBe("gameover");
    expect(s.resolved[current]).toBe("failed");
    expect(s.questionsAnswered).toBe(1);
    expect(s.endedAt).toBe(T0 + 500);
  });

  test("expert mode: one wrong click ends the game", () => {
    const s0 = newGame({ expertMode: true, maxTries: 1 });
    const wrong = s0.unanswered.find((id) => id !== s0.currentId)!;
    const s = guess(s0, wrong, T0 + 100);
    expect(s.phase).toBe("gameover");
    expect(s.resolved[s0.currentId!]).toBe("failed");
    expect(s.lastClickedId).toBe(wrong);
    expect(s.endedAt).toBe(T0 + 100);
  });
});

describe("timer", () => {
  test("deadline is set from the wall clock at game start", () => {
    const s = newGame({ timerLimitMs: 5000 });
    expect(s.timerDeadline).toBe(T0 + 5000);
    expect(timeRemainingMs(s, T0 + 1000)).toBe(4000);
  });

  test("expiry before the deadline is a no-op", () => {
    const s = newGame({ timerLimitMs: 5000 });
    expect(expireTimer(s, T0 + 4999)).toBe(s);
  });

  test("expiry resolves failed and enters mustclick", () => {
    const s0 = newGame({ timerLimitMs: 5000 });
    const s = expireTimer(s0, T0 + 5000);
    expect(s.phase).toBe("mustclick");
    expect(s.resolved[s0.currentId!]).toBe("failed");
    expect(s.questionsAnswered).toBe(1);
    expect(s.lastClickedId).toBeNull();
  });

  test("expiry in expert mode ends the game", () => {
    const s0 = newGame({ expertMode: true, timerLimitMs: 5000, maxTries: 1 });
    const s = expireTimer(s0, T0 + 5000);
    expect(s.phase).toBe("gameover");
  });

  test("pause freezes remaining time; resume shifts the deadline", () => {
    const s0 = newGame({ timerLimitMs: 5000 });
    const s1 = pause(s0, T0 + 2000);
    expect(timeRemainingMs(s1, T0 + 10_000)).toBe(3000);
    expect(expireTimer(s1, T0 + 10_000)).toBe(s1); // paused: cannot expire

    const s2 = resume(s1, T0 + 10_000);
    expect(s2.timerDeadline).toBe(T0 + 13_000);
    expect(s2.totalPausedMs).toBe(8000);
  });

  test("elapsed time excludes paused periods", () => {
    const s0 = newGame();
    const s1 = resume(pause(s0, T0 + 1000), T0 + 4000);
    expect(elapsedMs(s1, T0 + 5000)).toBe(2000);
  });
});

describe("skipping", () => {
  test("skip stashes tries, wrong guesses, and remaining time", () => {
    const s0 = newGame({ timerLimitMs: 10_000 });
    const first = s0.currentId!;
    const wrong = s0.unanswered.find((id) => id !== first)!;
    const s1 = guess(s0, wrong, T0);
    const s2 = skip(s1, 1, T0 + 4000);

    expect(s2.currentId).not.toBe(first);
    expect(s2.triesRemaining).toBe(3);
    expect(s2.wrongGuessIds).toEqual([]);
    expect(s2.timerDeadline).toBe(T0 + 4000 + 10_000);
    expect(s2.saved[first]).toEqual({
      triesRemaining: 2,
      wrongGuessIds: [wrong],
      timeLeftMs: 6000,
    });
  });

  test("skipping back restores the stashed progress", () => {
    const s0 = newGame({ timerLimitMs: 10_000 });
    const first = s0.currentId!;
    const wrong = s0.unanswered.find((id) => id !== first)!;
    let s = guess(s0, wrong, T0);
    s = skip(s, 1, T0 + 4000);
    s = skip(s, -1, T0 + 5000);

    expect(s.currentId).toBe(first);
    expect(s.triesRemaining).toBe(2);
    expect(s.wrongGuessIds).toEqual([wrong]);
    expect(s.timerDeadline).toBe(T0 + 5000 + 6000);
  });

  test("skip wraps around the unanswered list", () => {
    const s0 = newGame();
    let s = s0;
    for (let i = 0; i < s0.unanswered.length; i++) s = skip(s, 1, T0);
    expect(s.currentId).toBe(s0.currentId);
  });

  test("skip is a no-op outside playing or with one country left", () => {
    const s0 = createSoloGame(["100"], config(), 1, T0);
    expect(skip(s0, 1, T0)).toBe(s0);
  });
});
