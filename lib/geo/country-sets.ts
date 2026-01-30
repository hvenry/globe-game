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
    id: "africa",
    name: "Africa",
    description: "54 countries",
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
      "178", // Congo
      "180", // DR Congo
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
    description: "48 countries",
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
      "196", // Cyprus
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
      "634", // Qatar
      "682", // Saudi Arabia
      "702", // Singapore
      "410", // South Korea
      "144", // Sri Lanka
      "760", // Syria
      "762", // Tajikistan
      "764", // Thailand
      "626", // Timor-Leste
      "792", // Turkey
      "795", // Turkmenistan
      "784", // United Arab Emirates
      "860", // Uzbekistan
      "704", // Vietnam
      "887", // Yemen
      "275", // State of Palestine
    ],
  },
  {
    id: "europe",
    name: "Europe",
    description: "44 countries",
    countryIds: [
      "008", // Albania
      "020", // Andorra
      "040", // Austria
      "112", // Belarus
      "056", // Belgium
      "070", // Bosnia and Herzegovina
      "100", // Bulgaria
      "191", // Croatia
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
    ],
  },
  {
    id: "north_america",
    name: "North America",
    description: "23 countries",
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
    description: "12 countries",
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
    description: "14 countries",
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
