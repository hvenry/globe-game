"use client";

import { useEffect, useRef } from "react";
import { formatClock } from "@/lib/utils";

interface GameClockProps {
  /** Epoch ms the clock counts from. */
  startedAt: number;
  /** Time not counted: pauses so far. */
  excludedMs?: number;
  /** Epoch ms the clock froze at (a pause, or the end), or null while running. */
  frozenAt?: number | null;
  /** Added to `Date.now()`, for a clock kept by the server. */
  offsetMs?: number;
  className?: string;
}

/**
 * The game's elapsed time to the millisecond. It ticks every frame by writing
 * its own text rather than re-rendering: a clock is the one HUD readout that
 * changes sixty times a second, and React has no part in that.
 */
export default function GameClock({
  startedAt,
  excludedMs = 0,
  frozenAt = null,
  offsetMs = 0,
  className = "",
}: GameClockProps) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const elapsed = () =>
      (frozenAt ?? Date.now() + offsetMs) - startedAt - excludedMs;
    el.textContent = formatClock(elapsed());
    if (frozenAt !== null) return;
    let frame = requestAnimationFrame(function tick() {
      el.textContent = formatClock(elapsed());
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [startedAt, excludedMs, frozenAt, offsetMs]);

  return (
    <p
      ref={ref}
      aria-label="Elapsed time"
      className={`hud-pill readout text-sm text-mid md:text-base ${className}`}
    />
  );
}
