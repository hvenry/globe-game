"use client";

import { useEffect, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  delayStart?: number;
}

/** Counts up to `value` with an ease-out curve. Renders as a bare number. */
export default function AnimatedCounter({
  value,
  duration = 1000,
  delayStart = 0,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame: number | null = null;

    const delayTimeout = setTimeout(() => {
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(value * eased));
        if (progress < 1) {
          frame = requestAnimationFrame(animate);
        }
      };

      frame = requestAnimationFrame(animate);
    }, delayStart);

    return () => {
      clearTimeout(delayTimeout);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [value, duration, delayStart]);

  return <>{display}</>;
}
