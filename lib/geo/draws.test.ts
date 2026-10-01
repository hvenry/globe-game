import { describe, expect, it } from "vitest";
import { WORLD_IDS, COUNTRY_SETS, setSize } from "./country-sets";
import { GUESSABLE_IDS } from "./country-names";
import { dailyKey, dailySeed, idsFor, rankedIds, seedFor } from "./draws";
import { COUNTRY_STATS } from "./country-stats";

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

describe("ranked sets", () => {
  it("has a statistic for every guessable country", () => {
    for (const id of GUESSABLE_IDS) {
      expect(COUNTRY_STATS[id], id).toBeDefined();
      expect(COUNTRY_STATS[id].area).toBeGreaterThan(0);
      expect(COUNTRY_STATS[id].population).toBeGreaterThan(0);
    }
  });

  it("largest by area opens with Russia, Canada, the United States and China", () => {
    expect(rankedIds({ by: "area", count: 4 })).toEqual([
      "643",
      "124",
      "840",
      "156",
    ]);
  });

  it("most populous opens with India and China, and Taiwan makes the top 75", () => {
    expect(rankedIds({ by: "population", count: 2 })).toEqual(["356", "156"]);
    expect(rankedIds({ by: "population", count: 75 })).toContain("158");
  });

  it("every size returns exactly that many, in order, ignoring the seed", () => {
    for (const n of [10, 25, 50, 100] as const) {
      const ids = idsFor(`area_${n}`, 1);
      expect(ids).toHaveLength(n);
      expect(new Set(ids).size).toBe(n);
      expect(idsFor(`population_${n}`, 2)).toEqual(
        idsFor(`population_${n}`, 3),
      );
    }
    expect(setSize("population_100")).toBe(100);
  });
});
