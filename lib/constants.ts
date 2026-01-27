export const COLORS = {
  background: "#000000",
  text: "#FFFFFF",
  muted: "#A0A0A0",
  emerald: "#10B981",
  error: "#EF4444",
  surface: "#111111",
  border: "#222222",
  globeBase: "#0A0A0A",
  countryBorder: "#333333",
  countryDefault: "rgba(255,255,255,0.03)",
  countryHover: "rgba(255,255,255,0.12)",
  countryWrong: "rgba(239,68,68,0.4)",
  countryCorrect: "rgba(16,185,129,0.6)",
  countryRevealed: "rgba(239,68,68,0.7)",
} as const;

export const GAME_CONFIG = {
  maxTries: 3,
  pointsPerTry: 100,
  feedbackDuration: 2000,
  totalCountries: 195,
} as const;

export const GLOBE_CONFIG = {
  radius: 100,
  meshRadius: 100.2,
  segments: 64,
  cameraZ: 300,
  cameraFov: 45,
  autoRotateSpeed: 0.3,
  dampingFactor: 0.1,
} as const;
