/**
 * Feature flags, fixed at build time from `NEXT_PUBLIC_FEATURE_*` variables.
 *
 * Off unless the variable is exactly "1", so production ships the safe set
 * and a flag is turned on deliberately. For local work:
 *
 *   NEXT_PUBLIC_FEATURE_LIGHT_MODE=1 pnpm dev
 *
 * On Vercel, set the variable per environment; Next inlines it at build.
 */
export const FEATURES = {
  /** The light theme: its palette is not finished, so the picker is hidden and dark is forced. */
  lightMode: process.env.NEXT_PUBLIC_FEATURE_LIGHT_MODE === "1",
} as const;
