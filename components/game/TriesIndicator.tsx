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

  if (phase !== "playing" && phase !== "feedback") return null;

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
      <div className={`flex gap-2 ${shaking ? "animate-shake" : ""}`}>
        {Array.from({ length: maxTries }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors duration-200 ${
              i < triesRemaining ? "bg-white" : "bg-white/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
