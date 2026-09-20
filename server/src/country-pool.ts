/**
 * The country pool a race draws from.
 *
 * The client resolves "all countries" from the parsed TopoJSON, which is far
 * too large to ship in a Worker. It does not need to: the continent sets
 * partition the guessable world exactly, so `WORLD_IDS` is the same pool.
 * Draw sets resolve through the shared `idsFor`, so a race and a solo game
 * given the same seed play the same countries.
 */

import {
  getCountrySet,
  isCountrySetId,
  type CountrySetId,
  fixedCountOf,
} from "../../lib/geo/country-sets";
import { idsFor, seedFor } from "../../lib/geo/draws";

export { isCountrySetId };

/** Set ids arrive over the wire, so an unknown one falls back to the world. */
function toSetId(value: string): CountrySetId {
  return isCountrySetId(value) ? value : "all";
}

/** Countries in play for a set, resolved for `seed`. */
export function poolFor(setId: string, seed: number): readonly string[] {
  return idsFor(toSetId(setId), seed);
}

/** The seed a race on `setId` runs on: the day's for a daily draw, else `fallback`. */
export function raceSeed(setId: string, fallback: number): number {
  return seedFor(toSetId(setId), fallback);
}

/** A draw or ranked set fixes its own count; any other set plays what the host set. */
export function countFor(setId: string, configured: number): number {
  return fixedCountOf(getCountrySet(toSetId(setId))) ?? configured;
}
