"use client";

import { useGameStore } from "@/lib/store/game-store";
import { useEffect, useState } from "react";

export default function TriesIndicator() {
  const phase = useGameStore((s) => s.phase);
  const triesRemaining = useGameStore((s) => s.triesRemaining);
  const maxTries = useGameStore((s) => s.maxTries);
  const [shaking, setShaking] = useState(false);
  const [prevTries, setPrevTries] = useState(triesRemaining);

  useEffect(() => {
    if (triesRemaining < prevTries && phase === "playing") {
      setShaking(true);
      const timer = setTimeout(() => setShaking(false), 300);
      setPrevTries(triesRemaining);
      return () => clearTimeout(timer);
    }
    setPrevTries(triesRemaining);
  }, [triesRemaining, prevTries, phase]);

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
