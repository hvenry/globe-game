"use client";

/**
 * A tally roller: each digit is a vertical strip of 0–9 that slides to the
 * new value, so a jump from 1,250 to 2,000 spins every column rather than
 * swapping the text. Columns are added as the number grows and never removed
 * mid-race, so the readout only ever widens.
 */

import { useEffect, useState } from "react";

/**
 * Several turns of 0–9 on the strip, so any step from one digit to the next
 * can be taken upward, wrapping past 9 without ever sliding back down. More
 * than the two a single step needs: score changes can land faster than one
 * slide settles, and each one advances the strip further before it snaps.
 */
const TURNS = 6;
/** Every digit on the strip, top to bottom: `TURNS` runs of 0–9. */
const STRIP = Array.from({ length: 10 * TURNS }, (_, i) => i % 10);

/** Always rolls up: 9 → 0 continues on to the next turn of the strip. */
function Column({ digit }: { digit: number }) {
  const [pos, setPos] = useState(digit);
  const [snapping, setSnapping] = useState(false);

  // Advance during render (the "adjust state on prop change" pattern): the
  // shortest upward distance to the new digit.
  const shown = pos % 10;
  if (shown !== digit) {
    const next = pos + ((digit - shown + 10) % 10);
    // Out of strip: rewind a turn first. The digit is unchanged, so the only
    // visible cost is one slide starting a little higher than it should.
    setPos(next >= STRIP.length ? next - 10 : next);
  }

  // Once a slide has landed on the second turn or beyond, drop a whole turn
  // without animating; the digit on screen is the same, so nothing moves.
  useEffect(() => {
    if (!snapping) return;
    const id = requestAnimationFrame(() => setSnapping(false));
    return () => cancelAnimationFrame(id);
  }, [snapping]);

  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden">
      <span
        className={`absolute left-0 top-0 flex flex-col ${
          snapping ? "" : "transition-transform duration-500 ease-out"
        }`}
        style={{ transform: `translateY(-${pos}em)` }}
        onTransitionEnd={() => {
          if (pos >= 10) {
            setSnapping(true);
            setPos(pos - 10);
          }
        }}
      >
        {STRIP.map((d, i) => (
          <span key={i} className="block h-[1em] leading-[1em]">
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
