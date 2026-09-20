/**
 * Random-draw sets, resolved to concrete country ids.
 *
 * Pure, so the browser and the race server draw the same countries from the
 * same seed. A daily draw seeds from the UTC date; everything else seeds
 * from whatever the caller minted for the game.
 */

import { seededShuffle } from "../engine/rng";
import { WORLD_IDS, getCountrySet, type CountrySetId } from "./country-sets";

/** The UTC date a daily draw belongs to, as `YYYY-MM-DD`. */
export function dailyKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

/**
 * One seed per UTC day, the same on every machine: the day's key read as a
 * number, so the draw turns over exactly when the key it is filed under does.
 */
export function dailySeed(now = Date.now()): number {
  return Number(dailyKey(now).replace(/-/g, ""));
}

/** The seed a set's game should run on: the day's for a daily draw, else the caller's. */
export function seedFor(
  setId: CountrySetId,
  fallback: number,
  now = Date.now(),
): number {
  return getCountrySet(setId).draw?.daily ? dailySeed(now) : fallback;
}

/**
 * The ids a set puts in play for a game with `seed`. Fixed sets return their
 * list; draws return `count` of the world in seeded order; "all" is the world.
 */
export function idsFor(setId: CountrySetId, seed: number): readonly string[] {
  const set = getCountrySet(setId);
  if (set.draw) return seededShuffle(WORLD_IDS, seed).slice(0, set.draw.count);
  return set.countryIds ?? WORLD_IDS;
}
