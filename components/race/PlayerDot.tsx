"use client";

import { playerPalette } from "@/lib/store/race-store";

/**
 * A player's identity colour as a dot. Every roster, standing and feed line
 * uses the same mark, so who a row belongs to reads the same everywhere.
 */
export default function PlayerDot({
  color,
  className = "h-2 w-2",
}: {
  color: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: playerPalette(color).claim }}
    />
  );
}
