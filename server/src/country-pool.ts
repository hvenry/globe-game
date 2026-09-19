/**
 * The country pool a race draws from.
 *
 * The client resolves "all countries" from the parsed TopoJSON, which is far
 * too large to ship in a Worker. It does not need to: the six continent sets
 * partition the 195 guessable countries exactly — no overlap, no remainder —
 * so their union is the same pool.
 */

import { COUNTRY_SETS, type CountrySetId } from "../../lib/geo/country-sets";

const ALL_IDS: string[] = COUNTRY_SETS.flatMap((set) => set.countryIds ?? []);

export function poolFor(setId: string): string[] {
  return COUNTRY_SETS.find((s) => s.id === setId)?.countryIds ?? ALL_IDS;
}

export function isCountrySetId(value: string): value is CountrySetId {
  return COUNTRY_SETS.some((s) => s.id === value);
}
