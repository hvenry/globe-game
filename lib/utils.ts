export function formatTime(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatCountdown(seconds: number): string {
  if (seconds >= 10) {
    return Math.floor(seconds).toString();
  }
  return seconds.toFixed(1);
}

/**
 * Format a score ratio (0-1) as a whole-number percentage string (without the % sign).
 * Uses floor instead of round so scores like 99.8% display as 99, not 100.
 * 100 is only returned when the raw score is exactly 1.0 (all perfect).
 */
export function formatScore(raw: number): string {
  if (raw <= 0) return "0";
  if (raw >= 1) return "100";
  return Math.floor(raw * 100).toString();
}

/**
 * Length tier for a country name, used to step the type scale down so the long
 * ones stay on a sensible number of lines.
 *
 * The set spans "Chad" (4) to "Democratic Republic of the Congo" (32), so a
 * single size wraps the long names to three lines in the in-game prompt, which
 * has to sit between the menu button and the score readout. Used for the HUD
 * only — the menu and results panels have room to run at a fixed size, and
 * varying type inside a panel reads as inconsistency rather than as fit.
 */
export type NameTier = "short" | "medium" | "long";

export function countryNameTier(name: string): NameTier {
  if (name.length > 21) return "long";
  if (name.length > 14) return "medium";
  return "short";
}
