export type ThemeMode = "dark" | "light";

/**
 * Three.js scene palette, one per theme.
 *
 * A WebGL material can't read a CSS custom property, so the scene keeps a
 * palette parallel to the DOM's, selected by the same theme setting. The two
 * themes are different worlds rather than inversions — a night planet and a
 * printed map — so almost every value differs, including the light rig.
 *
 * `land: null` is what keeps the dark globe bare.
 */
export interface ScenePalette {
  /** Sphere color beneath everything — ocean in light, void in dark. */
  globeBase: string;
  /** Land fill, or null to leave the globe bare. */
  land: string | null;
  countryBorder: string;
  /** Border line opacity — the pale map needs near-solid outlines. */
  borderOpacity: number;
  countryHover: string;
  /** Hover wash strength; a white wash on pale land needs more of it. */
  hoverOpacity: number;
  countryWrongGuess: string;
  countryPerfect: string;
  countryAlmost: string;
  countryFailed: string;
  /**
   * A translucent fill over coloured land picks up the land and shifts hue,
   * where over black it only darkens — so light needs near-solid fills.
   */
  fillOpacity: {
    wrongGuess: number;
    perfect: number;
    almost: number;
    failed: number;
  };
  /**
   * Countries outside the active set. Dark keeps a dim outline — the only way
   * the rest of the world reads; light paints them as open water, where an
   * outline would just be grey lines in the sea.
   */
  outOfSetScale: number;
  grid: string;
  gridOpacity: number;
  star: string;
  starOpacity: number;
  atmosphere: string;
  atmosphereOpacity: number;
  /**
   * Render unlit, so fills land at exactly their palette value. A painted
   * globe takes its form from the outlines, not from shading, and lighting a
   * flat palette measurably drags every colour toward mud.
   */
  unlit: boolean;
  /** Only consulted when `unlit` is false. */
  ambientIntensity: number;
  directionalIntensity: number;
}

export const SCENE_PALETTES: Record<ThemeMode, ScenePalette> = {
  dark: {
    globeBase: "#0A0A0A",
    land: null,
    countryBorder: "#666666",
    borderOpacity: 0.7,
    countryHover: "#ffffff",
    hoverOpacity: 0.22,
    countryWrongGuess: "#ef4444",
    countryPerfect: "#10b981",
    countryAlmost: "#eab308",
    countryFailed: "#ef4444",
    fillOpacity: {
      wrongGuess: 0.5,
      perfect: 0.65,
      almost: 0.6,
      failed: 0.6,
    },
    outOfSetScale: 0.1,
    grid: "#666666",
    gridOpacity: 0.3,
    star: "#ffffff",
    starOpacity: 0.6,
    atmosphere: "#3ddc84",
    atmosphereOpacity: 0.04,
    unlit: false,
    ambientIntensity: 0.15,
    directionalIntensity: 0.8,
  },
  light: {
    // Bright is safe for the chromeless HUD: raising saturation raises
    // luminance, so near-black ink clears ~5:1 on ocean and ~11:1 on land.
    globeBase: "#1e82d2",
    land: "#59cf67",
    // On a coloured map the borders carry the contrast, not the fills.
    countryBorder: "#05090c",
    borderOpacity: 0.95,
    countryHover: "#ffffff",
    hoverOpacity: 0.5,
    // Diverges from the DOM channels on purpose: text on a white panel needs
    // dark accents, a fill on green land needs bright ones. Green-for-correct
    // is invisible on land, so a cleared country goes white instead.
    countryWrongGuess: "#dc2626",
    countryPerfect: "#ffffff",
    countryAlmost: "#facc15",
    countryFailed: "#dc2626",
    fillOpacity: {
      wrongGuess: 0.8,
      perfect: 0.88,
      almost: 0.85,
      failed: 0.85,
    },
    outOfSetScale: 0,
    grid: "#131b21",
    gridOpacity: 0.5,
    star: "#42525c",
    starOpacity: 0,
    atmosphere: "#7cc6f5",
    atmosphereOpacity: 0.12,
    unlit: true,
    ambientIntensity: 1,
    directionalIntensity: 0,
  },
};

/**
 * Paint order for the globe's transparent layers.
 *
 * They are all spheres centred on the origin, so they sort to the same depth
 * and three.js tie-breaks on object id — creation order. A layer that mounts
 * later (the land map exists only in the light theme) would otherwise jump in
 * front and hide the ones below until a reload. Any new layer needs an entry.
 */
export const GLOBE_LAYER = {
  grid: 1,
  atmosphere: 2,
  land: 3,
  fills: 4,
  hover: 5,
  pulse: 6,
  borders: 7,
  markers: 8,
  pulseRing: 9,
  picker: 10,
} as const;

/** A new ring is born, the fill flashes, and the cue plays, every period. */
const PULSE_PERIOD_MS = 1_200;

/**
 * The "find it" pulse: radar rings, the fill's red/white swap and the
 * repeating cue all run on this one beat, so what you see and hear line up.
 */
export const PULSE_CONFIG = {
  periodMs: PULSE_PERIOD_MS,
  /** The same beat where three.js clocks are, so no caller divides by hand. */
  periodSeconds: PULSE_PERIOD_MS / 1000,
  /** Rings in flight at once; each takes `rings × period` to reach the edge. */
  rings: 3,
} as const;

/**
 * Master sound. The engine holds these until the settings store hydrates and
 * tells it otherwise, so a cue fired before then is already at the right level.
 */
export const SOUND_CONFIG = {
  /** Sound is part of the game, so it starts on; the toggle is one tap away. */
  defaultEnabled: true,
  /** Present without taking over a room the player is sitting in. */
  defaultVolume: 0.7,
  /** Volume changes ramp over this long, so dragging the slider never clicks. */
  volumeRampSeconds: 0.02,
} as const;

export const GAME_CONFIG = {
  maxTries: 3,
  feedbackDuration: 800,
  // Expert-mode loss reveal: short hold on the missed country after the
  // camera arrives, before the results card appears
  expertRevealHold: 700,
  // Safety cap: show the results even if the reveal flight never settles
  // (e.g. no reveal target exists). Must exceed the longest flight time.
  expertRevealMaxWait: 6000,
} as const;

export const TIMER_CONFIG = {
  availableLimits: [null, 5, 10, 15, 30] as const,
  defaultLimit: null as number | null,
  expertModeLimit: 5, // Expert mode is locked to 5 seconds
  updateInterval: 100, // ms
  warningThreshold: 0.3, // 30% remaining
  criticalThreshold: 0.6, // 60% remaining for yellow transition
} as const;

/**
 * Head-to-head race defaults (see docs/race-mode.md). The engine never
 * reads these; whoever creates a race passes them in, so a room can override.
 */
/**
 * A fill the globe paints exactly as given, for colours outside the solo
 * vocabulary — a race player's own. Anywhere a `Resolution` is accepted, one
 * of these can stand in its place.
 */
export interface CountryFill {
  color: string;
  opacity: number;
  /**
   * `dots` stipples the country instead of flooding it. A miss painted this
   * way cannot be mistaken for a claim, whatever colour it takes.
   */
  pattern?: "dots";
}

/**
 * Race identity colours.
 *
 * Kept clear of the globe's own vocabulary — green for correct, red for
 * missed, yellow for partial — so a player's claim can never be read as a
 * result. `attempt` is the paler variant a wrong click takes; the same hexes
 * serve both themes, with the theme's own fill opacity doing the adapting.
 */
export type PlayerColorId = "blue" | "purple" | "orange" | "cyan";

export const PLAYER_COLOR_IDS: readonly PlayerColorId[] = [
  "blue",
  "purple",
  "orange",
  "cyan",
];

export const PLAYER_COLORS: Record<
  PlayerColorId,
  { claim: string; attempt: string }
> = {
  blue: { claim: "#1d4ed8", attempt: "#93c5fd" },
  purple: { claim: "#a855f7", attempt: "#d8b4fe" },
  orange: { claim: "#f97316", attempt: "#fdba74" },
  cyan: { claim: "#06b6d4", attempt: "#67e8f9" },
};

/**
 * The same identities as type on a panel, which the globe's hexes cannot be:
 * blue clears 3:1 on the black panel and cyan and orange clear it on the
 * white one, but neither pair clears both. Same split the expert channel
 * makes between `--expert` and `--expert-ink`, for the same reason.
 */
export const PLAYER_INKS: Record<ThemeMode, Record<PlayerColorId, string>> = {
  dark: {
    blue: "#60a5fa",
    purple: "#c084fc",
    orange: "#fb923c",
    cyan: "#22d3ee",
  },
  light: {
    blue: "#1d4ed8",
    purple: "#7e22ce",
    orange: "#c2410c",
    cyan: "#0e7490",
  },
};

export function isPlayerColorId(value: string): value is PlayerColorId {
  return Object.hasOwn(PLAYER_COLORS, value);
}

export const RACE_CONFIG = {
  /**
   * Countries in play. Deliberately above the 195 guessable ones: the engine
   * clamps the count to the pool it is handed, so any number past the largest
   * set reads as "play the whole set", whichever set the host picks.
   */
  countryCount: 250,
  countryWindowMs: 10_000,
  lockoutMs: 1_500,
  intermissionMs: 1_200,
  /** Lobby countdown before the first country appears. */
  countdownMs: 3_000,
} as const;

/**
 * Race points. Awarded by the engine, so every client and the server agree
 * to the point. Sized so a race of a few dozen countries lands in the
 * thousands, with the bonuses worth chasing but never worth more than the
 * claim itself.
 */
export const RACE_SCORING = {
  /** A correct click inside the window. */
  claim: 500,
  /** Added on top, scaled by the fraction of the window still left. */
  speedMax: 250,
  /** No wrong clicks on the way to this claim. */
  accuracy: 100,
  /** Per consecutive claim beyond the first, up to `comboMax`. */
  comboStep: 50,
  comboMax: 250,
  /** First to click a country everyone missed, once it is revealed. */
  recovery: 100,
} as const;

export const GLOBE_CONFIG = {
  radius: 100,
  meshRadius: 100.2,
  segments: 64,
  cameraZ: 350,
  cameraFov: 45,
  minDistance: 200,
  maxDistance: 450,
  // Camera distance while revealing the missed country on an expert loss
  revealDistance: 280,
  // Camera flight pacing (continent fly-in, loss reveal). Flight duration is
  // proportional to the arc travelled — nearby targets arrive fast, far ones
  // get a longer, readable journey. Time-based, so identical on any display.
  cameraFlightSpeed: 0.85, // radians per second
  cameraFlightMinDuration: 0.6, // seconds
  cameraFlightMaxDuration: 4.5, // seconds
  autoRotateSpeed: 0.3,
  dampingFactor: 0.08, // Increased from 0.04 for smoother rotation with more inertia
  // Rotate speed scales with distance to the globe SURFACE (d - radius), so
  // the ground tracks the pointer ~1:1 at every zoom level. This is the floor
  // the scale can't drop below.
  rotateSpeedMinFactor: 0.05,
  smallCountryMarkerRadius: 0.6, // 3D sphere radius
  smallCountryClickRadius: 0.8, // degrees for click detection (matches visual size)
  // Max pointer travel (px) for a press to still count as a click, not a drag
  dragThreshold: 5,

  // The FOV is vertical, so a portrait phone crops the globe at the desktop
  // distance. maxDistance has to move with cameraZ or the flight snaps back.
  narrow: {
    cameraZ: 470,
    maxDistance: 540,
  },

  // Touch (coarse pointer) tuning — no hover, no precise pointer, fat fingers
  touch: {
    minDistance: 140, // allow zooming close enough to tap micro-states
    dampingFactor: 0.18, // stronger damping = globe sticks to the finger
    rotateSpeedScale: 0.7, // finger drags cover more ground than mouse drags
    zoomSpeedScale: 0.8, // gentler pinch zoom
    dragThreshold: 12, // fingers wobble more than mice
    smallCountryRadiusScale: 1.6, // more forgiving tap radius for micro-states
  },
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
