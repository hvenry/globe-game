import { describe, expect, it } from "vitest";
import { WORLD_IDS, COUNTRY_SETS, setSize } from "./country-sets";
import { GUESSABLE_IDS } from "./country-names";
import { dailyKey, dailySeed, idsFor, seedFor } from "./draws";

describe("country sets", () => {
  it("the continents partition the guessable world exactly", () => {
    expect(new Set(WORLD_IDS).size).toBe(WORLD_IDS.length);
    expect(new Set(WORLD_IDS)).toEqual(GUESSABLE_IDS);
  });

  it("every region id is a guessable country", () => {
    for (const set of COUNTRY_SETS) {
      for (const id of set.countryIds ?? [])
        expect(GUESSABLE_IDS.has(id), `${set.id}:${id}`).toBe(true);
    }
  });

  it("includes Taiwan and Kosovo", () => {
    expect(GUESSABLE_IDS.has("158")).toBe(true);
    expect(GUESSABLE_IDS.has("383")).toBe(true);
    expect(setSize("asia")).toBe(48);
    expect(setSize("europe")).toBe(46);
  });
});

describe("draws", () => {
  it("draw sets return their count, from the world, without repeats", () => {
    const ids = idsFor("quick_10", 7);
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
    for (const id of ids) expect(GUESSABLE_IDS.has(id)).toBe(true);
  });

  it("the same seed draws the same countries; a new seed redraws", () => {
    expect(idsFor("sprint_25", 3)).toEqual(idsFor("sprint_25", 3));
    expect(idsFor("sprint_25", 3)).not.toEqual(idsFor("sprint_25", 4));
  });

  it("fixed sets ignore the seed", () => {
    expect(idsFor("nordics", 1)).toEqual(idsFor("nordics", 2));
    expect(idsFor("all", 1)).toEqual(WORLD_IDS);
  });

  it("daily seeds from the UTC date and changes at midnight UTC", () => {
    const before = Date.UTC(2026, 8, 19, 23, 59, 59);
    const after = Date.UTC(2026, 8, 20, 0, 0, 1);
    expect(dailySeed(before)).toBe(20260919);
    expect(dailySeed(after)).toBe(20260920);
    expect(dailyKey(before)).toBe("2026-09-19");
    expect(seedFor("daily_20", 42, before)).toBe(20260919);
    expect(seedFor("quick_10", 42, before)).toBe(42);
  });
});
