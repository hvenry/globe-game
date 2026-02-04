"use client";

import { useRef, useEffect, useState } from "react";

const GAP_PX = 15;
const SPEED_PX_PER_SEC = 10;

interface ScrollingTextProps {
  text: string;
  className?: string;
}

export default function ScrollingText({
  text,
  className = "",
}: ScrollingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [duration, setDuration] = useState(5);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const overflow = textEl.scrollWidth - container.clientWidth;
    if (overflow > 0) {
      setIsOverflowing(true);
      // Duration based on half the total width (text + gap) at constant speed
      const halfWidth = (textEl.scrollWidth + GAP_PX) / 2;
      setDuration(halfWidth / SPEED_PX_PER_SEC);
    } else {
      setIsOverflowing(false);
    }
  }, [text]);

  if (!isOverflowing) {
    return (
      <div ref={containerRef} className={`overflow-hidden ${className}`}>
        <span ref={textRef} className="inline-block whitespace-nowrap">
          {text}
        </span>
      </div>
    );
  }

  // Render two copies for seamless infinite loop
  return (
    <div ref={containerRef} className={`overflow-hidden ${className}`}>
      <span
        ref={textRef}
        className="inline-block whitespace-nowrap animate-scroll-text"
        style={{ "--scroll-duration": `${duration}s` } as React.CSSProperties}
      >
        [ {text} ]
        <span style={{ paddingRight: `${GAP_PX}px` }} />[ {text} ]
        <span style={{ paddingRight: `${GAP_PX}px` }} />
      </span>
    </div>
  );
}
