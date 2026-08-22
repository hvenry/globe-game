"use client";

import { useGameStore } from "@/lib/store/game-store";
import { useEffect, useState, useRef } from "react";

export default function TriesIndicator() {
  const phase = useGameStore((s) => s.phase);
  const triesRemaining = useGameStore((s) => s.triesRemaining);
  const maxTries = useGameStore((s) => s.maxTries);
  const [shaking, setShaking] = useState(false);
  const prevTriesRef = useRef(triesRemaining);

  useEffect(() => {
    if (triesRemaining < prevTriesRef.current && phase === "playing") {
      // Trigger shake animation asynchronously to avoid setState during render
      const shakeTimer = setTimeout(() => setShaking(true), 0);
      const resetTimer = setTimeout(() => setShaking(false), 300);
      prevTriesRef.current = triesRemaining;
      return () => {
        clearTimeout(shakeTimer);
        clearTimeout(resetTimer);
      };
    }
    prevTriesRef.current = triesRemaining;
  }, [triesRemaining, phase]);

  if (phase !== "playing" && phase !== "feedback" && phase !== "mustclick") return null;

  return (
    <div className="absolute bottom-[max(2rem,calc(env(safe-area-inset-bottom)+0.75rem))] left-1/2 z-10 -translate-x-1/2 md:bottom-8">
      <div
        className={`hud-glass flex items-center gap-1.5 px-2 py-1.5 md:gap-2 md:px-2.5 md:py-2 ${
          shaking ? "animate-shake" : ""
        }`}
      >
        {Array.from({ length: maxTries }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-3 rounded-[1px] transition-colors duration-200 md:h-2 md:w-3.5 ${
              i < triesRemaining
                ? "bg-signal shadow-[0_0_8px_rgb(var(--signal)/0.55)]"
                : "bg-hairline"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
