export const COLORS = {
  background: "#000000",
  text: "#FFFFFF",
  muted: "#A0A0A0",
  emerald: "#10B981",
  yellow: "#eab308",
  error: "#EF4444",
  surface: "#111111",
  border: "#222222",
  globeBase: "#0A0A0A",
  countryBorder: "#666666",
  countryDefault: "#ffffff",
  countryHover: "#ffffff",
  countryWrongGuess: "#ef4444",
  countryPerfect: "#10b981",
  countryImperfect: "#eab308",
  countryFailed: "#ef4444",
} as const;

export const GAME_CONFIG = {
  maxTries: 3,
  feedbackDuration: 1500,
} as const;

export const TIMER_CONFIG = {
  availableLimits: [null, 5, 10, 30, 60] as const,
  defaultLimit: null as number | null,
  expertModeLimit: 5, // Expert mode is locked to 5 seconds
  updateInterval: 100, // ms
  warningThreshold: 0.3, // 30% remaining
  criticalThreshold: 0.6, // 60% remaining for yellow transition
} as const;

export const GLOBE_CONFIG = {
  radius: 100,
  meshRadius: 100.2,
  segments: 64,
  cameraZ: 350,
  cameraFov: 45,
  autoRotateSpeed: 0.3,
  dampingFactor: 0.04,
  smallCountryMarkerRadius: 0.6, // 3D sphere radius
  smallCountryClickRadius: 0.8, // degrees for click detection (matches visual size)
} as const;

// Small countries that need clickable markers (ISO numeric codes)
export const SMALL_COUNTRIES = new Set([
  // Observers
  "336", // Vatican City
  "275", // Palestine

  // Europe
  "196", // Cyprus
  "492", // Monaco
  "674", // San Marino
  "438", // Liechtenstein
  "020", // Andorra
  "442", // Luxembourg
  "470", // Malta

  // Caribbean / Americas
  "028", // Antigua and Barbuda
  "044", // Bahamas
  "052", // Barbados
  "212", // Dominica
  "308", // Grenada
  "659", // Saint Kitts and Nevis
  "662", // Saint Lucia
  "670", // Saint Vincent and the Grenadines
  "780", // Trinidad and Tobago

  // Africa
  "174", // Comoros
  "132", // Cabo Verde
  "270", // The Gambia
  "678", // Sao Tome and Principe
  "690", // Seychelles
  "480", // Mauritius

  // Middle East
  "048", // Bahrain
  "414", // Kuwait
  "096", // Brunei

  // Asia-Pacific
  "462", // Maldives
  "702", // Singapore
  "626", // East Timor

  // Oceania
  "520", // Nauru
  "798", // Tuvalu
  "296", // Kiribati
  "584", // Marshall Islands
  "585", // Palau
  "583", // Micronesia
  "776", // Tonga
  "882", // Samoa
  "090", // Solomon Islands
  "242", // Fiji
  "548", // Vanuatu
]);
