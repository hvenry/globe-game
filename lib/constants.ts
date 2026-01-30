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
  feedbackDuration: 2000,
  totalCountries: 195,
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
  "336", // Vatican City
  "492", // Monaco
  "520", // Nauru
  "798", // Tuvalu (synthetic marker - not in TopoJSON)
  "674", // San Marino
  "438", // Liechtenstein
  "584", // Marshall Islands
  "659", // Saint Kitts and Nevis
  "462", // Maldives
  "470", // Malta
  "308", // Grenada
  "670", // Saint Vincent and the Grenadines
  "052", // Barbados
  "028", // Antigua and Barbuda
  "690", // Seychelles
  "585", // Palau
  "020", // Andorra
  "662", // Saint Lucia
  "583", // Micronesia
  "702", // Singapore
  "776", // Tonga
  "212", // Dominica
  "048", // Bahrain
  "296", // Kiribati
  "678", // Sao Tome and Principe
  "480", // Mauritius
  "174", // Comoros
  "442", // Luxembourg
  "882", // Samoa
  "132", // Cabo Verde
  "780", // Trinidad and Tobago
  "096", // Brunei
  "275", // Palestine
]);
