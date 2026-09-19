"use client";

/**
 * A tally roller: each digit is a vertical strip of 0–9 that slides to the
 * new value, so a jump from 1,250 to 2,000 spins every column rather than
 * swapping the text. Columns are added as the number grows and never removed
 * mid-race, so the readout only ever widens.
 */

import { useState } from "react";

const DIGITS = Array.from({ length: 10 }, (_, i) => i);

function Column({ digit }: { digit: number }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden">
      <span
        className="absolute left-0 top-0 flex flex-col transition-transform duration-500 ease-out"
        style={{ transform: `translateY(-${digit}em)` }}
      >
        {DIGITS.map((d) => (
          <span key={d} className="block h-[1em] leading-[1em]">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function ScoreRoller({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const text = String(Math.max(0, Math.floor(value)));
  // Widening is permanent for the roller's life; the tally never shrinks.
  // Adjusted during render rather than in an effect, so it never lags a frame.
  const [width, setWidth] = useState(text.length);
  if (text.length > width) setWidth(text.length);

  const digits = text.padStart(width, "0").split("");

  return (
    // `leading-none` and `items-center`: an overflow-hidden inline block
    // sits its bottom edge on the baseline, which lifted the digits above
    // the name beside them.
    <span
      className={`readout inline-flex items-center leading-none ${className}`}
      aria-label={text}
    >
      {digits.map((d, i) => {
        // Leading zeros from padding are dimmed so 0,450 does not read as 450
        // with a stray zero; a real leading zero (score 0) stays lit.
        const padding = i < width - text.length;
        return (
          <span key={i} className={padding ? "text-faint" : ""}>
            <Column digit={Number(d)} />
          </span>
        );
      })}
    </span>
  );
}
