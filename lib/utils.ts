import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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
