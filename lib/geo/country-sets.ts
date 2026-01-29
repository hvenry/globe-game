/**
 * Country Sets for Game Modes
 *
 * Each set contains an array of country IDs (ISO 3166-1 numeric codes as strings).
 * The "all" set is handled dynamically by using all guessable countries.
 *
 * To add countries to a set, add their ISO numeric code to the array.
 * You can find codes at: https://en.wikipedia.org/wiki/ISO_3166-1_numeric
 */

export type CountrySetId =
  | "all"
  | "small_islands"
  | "largest"
  | "highest_population"
  | "africa"
  | "asia"
  | "europe"
  | "north_america"
  | "south_america"
  | "oceania";

export interface CountrySetConfig {
  id: CountrySetId;
  name: string;
  description: string;
  countryIds: string[] | null; // null means use all countries
}

export const COUNTRY_SETS: CountrySetConfig[] = [
  {
    id: "all",
    name: "All Countries",
    description: "All 195 countries",
    countryIds: null,
  },
  {
    id: "small_islands",
    name: "Small Islands",
    description: "Island nations and small territories",
    countryIds: [
      // Add ISO numeric codes here, e.g.:
      // "336", // Vatican City
      // "492", // Monaco
      // "520", // Nauru
    ],
  },
  {
    id: "largest",
    name: "Largest Countries",
    description: "Countries by land area",
    countryIds: [
      // Add ISO numeric codes here, e.g.:
      // "643", // Russia
      // "124", // Canada
      // "840", // United States
    ],
  },
  {
    id: "highest_population",
    name: "Most Populous",
    description: "Countries by population",
    countryIds: [
      // Add ISO numeric codes here, e.g.:
      // "356", // India
      // "156", // China
      // "840", // United States
    ],
  },
  {
    id: "africa",
    name: "Africa",
    description: "African countries",
    countryIds: [
      // Add ISO numeric codes here
    ],
  },
  {
    id: "asia",
    name: "Asia",
    description: "Asian countries",
    countryIds: [
      // Add ISO numeric codes here
    ],
  },
  {
    id: "europe",
    name: "Europe",
    description: "European countries",
    countryIds: [
      // Add ISO numeric codes here
    ],
  },
  {
    id: "north_america",
    name: "North America",
    description: "North American countries",
    countryIds: [
      // Add ISO numeric codes here
    ],
  },
  {
    id: "south_america",
    name: "South America",
    description: "South American countries",
    countryIds: [
      // Add ISO numeric codes here
    ],
  },
  {
    id: "oceania",
    name: "Oceania",
    description: "Oceanian countries",
    countryIds: [
      // Add ISO numeric codes here
    ],
  },
];

export function getCountrySet(id: CountrySetId): CountrySetConfig {
  return COUNTRY_SETS.find((set) => set.id === id) ?? COUNTRY_SETS[0];
}

export function getAvailableCountrySets(): CountrySetConfig[] {
  // Return sets that have countries defined (or are "all")
  return COUNTRY_SETS.filter(
    (set) => set.id === "all" || (set.countryIds && set.countryIds.length > 0)
  );
}
