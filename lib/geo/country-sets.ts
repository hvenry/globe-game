/**
 * Country sets for game modes.
 *
 * Three kinds:
 * - `continent`: the six continents. They partition the guessable world, so
 *   their union is "all" — the race server relies on that to build its pool.
 * - `region`: sub-regions people want to drill. They overlap continents and
 *   are never used to derive anything.
 * - `draw`: not a list but a rule — a random sample of the world, sized and
 *   seeded per `draw`. `daily` seeds from the UTC date so everyone gets the
 *   same countries; otherwise every game redraws.
 *
 * Ids are ISO 3166-1 numeric codes as strings, plus "383" for Kosovo (which
 * has none). Sizes are derived, never written down, so they cannot drift.
 */

import { GUESSABLE_IDS } from "./country-names";

export type CountrySetKind = "continent" | "region" | "draw";

export interface DrawSpec {
  /** How many countries to draw from the whole world. */
  count: number;
  /** Seed from the UTC date, so the draw is the same for everyone that day. */
  daily?: boolean;
}

export interface CountrySetConfig {
  id: CountrySetId;
  name: string;
  kind: CountrySetKind;
  /** Fixed membership, or null for "all" and for draws. */
  countryIds: readonly string[] | null;
  draw?: DrawSpec;
}

export type CountrySetId =
  | "all"
  | "africa"
  | "asia"
  | "europe"
  | "north_america"
  | "south_america"
  | "oceania"
  | "caribbean"
  | "central_america"
  | "middle_east"
  | "southeast_asia"
  | "balkans"
  | "nordics"
  | "stans"
  | "west_africa"
  | "east_africa"
  | "southern_africa"
  | "quick_10"
  | "sprint_25"
  | "daily_20";

export const COUNTRY_SETS: readonly CountrySetConfig[] = [
  // "all" is the deselected state rather than a tile in the picker, so
  // `setsOfKind` leaves it out; its null ids keep it out of WORLD_IDS too.
  { id: "all", name: "All Countries", kind: "continent", countryIds: null },
  {
    id: "africa",
    name: "Africa",
    kind: "continent",
    countryIds: [
      "012", // Algeria
      "024", // Angola
      "204", // Benin
      "072", // Botswana
      "854", // Burkina Faso
      "108", // Burundi
      "132", // Cabo Verde
      "120", // Cameroon
      "140", // Central African Republic
      "148", // Chad
      "174", // Comoros
      "178", // Republic of the Congo
      "180", // Democratic Republic of the Congo
      "262", // Djibouti
      "818", // Egypt
      "226", // Equatorial Guinea
      "232", // Eritrea
      "748", // Eswatini
      "231", // Ethiopia
      "266", // Gabon
      "270", // Gambia
      "288", // Ghana
      "324", // Guinea
      "624", // Guinea-Bissau
      "384", // Ivory Coast
      "404", // Kenya
      "426", // Lesotho
      "430", // Liberia
      "434", // Libya
      "450", // Madagascar
      "454", // Malawi
      "466", // Mali
      "478", // Mauritania
      "480", // Mauritius
      "504", // Morocco
      "508", // Mozambique
      "516", // Namibia
      "562", // Niger
      "566", // Nigeria
      "646", // Rwanda
      "678", // Sao Tome and Principe
      "686", // Senegal
      "690", // Seychelles
      "694", // Sierra Leone
      "706", // Somalia
      "710", // South Africa
      "728", // South Sudan
      "729", // Sudan
      "834", // Tanzania
      "768", // Togo
      "788", // Tunisia
      "800", // Uganda
      "894", // Zambia
      "716", // Zimbabwe
    ],
  },
  {
    id: "asia",
    name: "Asia",
    kind: "continent",
    countryIds: [
      "004", // Afghanistan
      "051", // Armenia
      "031", // Azerbaijan
      "048", // Bahrain
      "050", // Bangladesh
      "064", // Bhutan
      "096", // Brunei
      "116", // Cambodia
      "156", // China
      "626", // East Timor
      "268", // Georgia
      "356", // India
      "360", // Indonesia
      "364", // Iran
      "368", // Iraq
      "376", // Israel
      "392", // Japan
      "400", // Jordan
      "398", // Kazakhstan
      "414", // Kuwait
      "417", // Kyrgyzstan
      "418", // Laos
      "422", // Lebanon
      "458", // Malaysia
      "462", // Maldives
      "496", // Mongolia
      "104", // Myanmar
      "524", // Nepal
      "408", // North Korea
      "512", // Oman
      "586", // Pakistan
      "608", // Philippines
      "275", // Palestine
      "634", // Qatar
      "682", // Saudi Arabia
      "702", // Singapore
      "410", // South Korea
      "144", // Sri Lanka
      "760", // Syria
      "762", // Tajikistan
      "764", // Thailand
      "792", // Turkey
      "795", // Turkmenistan
      "784", // United Arab Emirates
      "860", // Uzbekistan
      "704", // Vietnam
      "887", // Yemen
      "158", // Taiwan
    ],
  },
  {
    id: "europe",
    name: "Europe",
    kind: "continent",
    countryIds: [
      "008", // Albania
      "020", // Andorra
      "040", // Austria
      "112", // Belarus
      "056", // Belgium
      "070", // Bosnia and Herzegovina
      "100", // Bulgaria
      "191", // Croatia
      "196", // Cyprus
      "203", // Czech Republic
      "208", // Denmark
      "233", // Estonia
      "246", // Finland
      "250", // France
      "276", // Germany
      "300", // Greece
      "348", // Hungary
      "352", // Iceland
      "372", // Ireland
      "380", // Italy
      "428", // Latvia
      "438", // Liechtenstein
      "440", // Lithuania
      "442", // Luxembourg
      "470", // Malta
      "498", // Moldova
      "492", // Monaco
      "499", // Montenegro
      "528", // Netherlands
      "807", // North Macedonia
      "578", // Norway
      "616", // Poland
      "620", // Portugal
      "642", // Romania
      "643", // Russia
      "674", // San Marino
      "688", // Serbia
      "703", // Slovakia
      "705", // Slovenia
      "724", // Spain
      "752", // Sweden
      "756", // Switzerland
      "804", // Ukraine
      "826", // United Kingdom
      "336", // Vatican City
      "383", // Kosovo
    ],
  },
  {
    id: "north_america",
    name: "North America",
    kind: "continent",
    countryIds: [
      "028", // Antigua and Barbuda
      "044", // Bahamas
      "052", // Barbados
      "084", // Belize
      "124", // Canada
      "188", // Costa Rica
      "192", // Cuba
      "212", // Dominica
      "214", // Dominican Republic
      "222", // El Salvador
      "308", // Grenada
      "320", // Guatemala
      "332", // Haiti
      "340", // Honduras
      "388", // Jamaica
      "484", // Mexico
      "558", // Nicaragua
      "591", // Panama
      "659", // Saint Kitts and Nevis
      "662", // Saint Lucia
      "670", // Saint Vincent and the Grenadines
      "780", // Trinidad and Tobago
      "840", // United States
    ],
  },
  {
    id: "south_america",
    name: "South America",
    kind: "continent",
    countryIds: [
      "032", // Argentina
      "068", // Bolivia
      "076", // Brazil
      "152", // Chile
      "170", // Colombia
      "218", // Ecuador
      "328", // Guyana
      "600", // Paraguay
      "604", // Peru
      "740", // Suriname
      "858", // Uruguay
      "862", // Venezuela
    ],
  },
  {
    id: "oceania",
    name: "Oceania",
    kind: "continent",
    countryIds: [
      "036", // Australia
      "242", // Fiji
      "296", // Kiribati
      "584", // Marshall Islands
      "583", // Micronesia
      "520", // Nauru
      "554", // New Zealand
      "585", // Palau
      "598", // Papua New Guinea
      "882", // Samoa
      "090", // Solomon Islands
      "776", // Tonga
      "798", // Tuvalu
      "548", // Vanuatu
    ],
  },
  {
    id: "caribbean",
    name: "Caribbean",
    kind: "region",
    countryIds: [
      "028", // Antigua and Barbuda
      "044", // Bahamas
      "052", // Barbados
      "192", // Cuba
      "212", // Dominica
      "214", // Dominican Republic
      "308", // Grenada
      "332", // Haiti
      "388", // Jamaica
      "659", // Saint Kitts and Nevis
      "662", // Saint Lucia
      "670", // Saint Vincent and the Grenadines
      "780", // Trinidad and Tobago
    ],
  },
  {
    id: "central_america",
    name: "Central America",
    kind: "region",
    countryIds: [
      "084", // Belize
      "188", // Costa Rica
      "222", // El Salvador
      "320", // Guatemala
      "340", // Honduras
      "558", // Nicaragua
      "591", // Panama
    ],
  },
  {
    id: "middle_east",
    name: "Middle East",
    kind: "region",
    countryIds: [
      "048", // Bahrain
      "818", // Egypt
      "364", // Iran
      "368", // Iraq
      "376", // Israel
      "400", // Jordan
      "414", // Kuwait
      "422", // Lebanon
      "512", // Oman
      "275", // Palestine
      "634", // Qatar
      "682", // Saudi Arabia
      "760", // Syria
      "792", // Turkey
      "784", // United Arab Emirates
      "887", // Yemen
    ],
  },
  {
    id: "southeast_asia",
    name: "Southeast Asia",
    kind: "region",
    countryIds: [
      "096", // Brunei
      "116", // Cambodia
      "626", // East Timor
      "360", // Indonesia
      "418", // Laos
      "458", // Malaysia
      "104", // Myanmar
      "608", // Philippines
      "702", // Singapore
      "764", // Thailand
      "704", // Vietnam
    ],
  },
  {
    id: "balkans",
    name: "Balkans",
    kind: "region",
    countryIds: [
      "008", // Albania
      "070", // Bosnia and Herzegovina
      "100", // Bulgaria
      "191", // Croatia
      "300", // Greece
      "383", // Kosovo
      "499", // Montenegro
      "807", // North Macedonia
      "642", // Romania
      "688", // Serbia
      "705", // Slovenia
    ],
  },
  {
    id: "nordics",
    name: "Nordics",
    kind: "region",
    countryIds: [
      "208", // Denmark
      "246", // Finland
      "352", // Iceland
      "578", // Norway
      "752", // Sweden
    ],
  },
  {
    id: "stans",
    name: "The -stans",
    kind: "region",
    countryIds: [
      "004", // Afghanistan
      "398", // Kazakhstan
      "417", // Kyrgyzstan
      "586", // Pakistan
      "762", // Tajikistan
      "795", // Turkmenistan
      "860", // Uzbekistan
    ],
  },
  {
    id: "west_africa",
    name: "West Africa",
    kind: "region",
    countryIds: [
      "204", // Benin
      "854", // Burkina Faso
      "132", // Cabo Verde
      "384", // Ivory Coast
      "270", // Gambia
      "288", // Ghana
      "324", // Guinea
      "624", // Guinea-Bissau
      "430", // Liberia
      "466", // Mali
      "478", // Mauritania
      "562", // Niger
      "566", // Nigeria
      "686", // Senegal
      "694", // Sierra Leone
      "768", // Togo
    ],
  },
  {
    id: "east_africa",
    name: "East Africa",
    kind: "region",
    countryIds: [
      "108", // Burundi
      "174", // Comoros
      "262", // Djibouti
      "232", // Eritrea
      "231", // Ethiopia
      "404", // Kenya
      "450", // Madagascar
      "480", // Mauritius
      "646", // Rwanda
      "690", // Seychelles
      "706", // Somalia
      "728", // South Sudan
      "834", // Tanzania
      "800", // Uganda
    ],
  },
  {
    id: "southern_africa",
    name: "Southern Africa",
    kind: "region",
    countryIds: [
      "024", // Angola
      "072", // Botswana
      "748", // Eswatini
      "426", // Lesotho
      "454", // Malawi
      "508", // Mozambique
      "516", // Namibia
      "710", // South Africa
      "894", // Zambia
      "716", // Zimbabwe
    ],
  },
  {
    id: "quick_10",
    name: "Quick 10",
    kind: "draw",
    countryIds: null,
    draw: { count: 10 },
  },
  {
    id: "sprint_25",
    name: "Sprint 25",
    kind: "draw",
    countryIds: null,
    draw: { count: 25 },
  },
  {
    id: "daily_20",
    name: "Daily 20",
    kind: "draw",
    countryIds: null,
    draw: { count: 20, daily: true },
  },
];

export function getCountrySet(id: CountrySetId): CountrySetConfig {
  return COUNTRY_SETS.find((set) => set.id === id) ?? COUNTRY_SETS[0];
}

export function isCountrySetId(value: string): value is CountrySetId {
  return COUNTRY_SETS.some((set) => set.id === value);
}

export function setsOfKind(kind: CountrySetKind): CountrySetConfig[] {
  return COUNTRY_SETS.filter((set) => set.kind === kind && set.id !== "all");
}

/** How many countries a set puts in play. Draws are their count; "all" is the world. */
export function setSize(id: CountrySetId): number {
  const set = getCountrySet(id);
  if (set.draw) return Math.min(set.draw.count, GUESSABLE_IDS.size);
  if (!set.countryIds) return GUESSABLE_IDS.size;
  return set.countryIds.filter((c) => GUESSABLE_IDS.has(c)).length;
}

/** The whole guessable world as the continents list it: the pool draws come from. */
export const WORLD_IDS: readonly string[] = COUNTRY_SETS.flatMap((set) =>
  set.kind === "continent" ? (set.countryIds ?? []) : [],
);
