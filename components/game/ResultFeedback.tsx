"use client";

import { useEffect } from "react";
import { useGameStore } from "@/lib/store/game-store";
import { GAME_CONFIG } from "@/lib/constants";

export default function ResultFeedback() {
  const phase = useGameStore((s) => s.phase);
  const isCorrect = useGameStore((s) => s.isCorrect);
  const lastResolution = useGameStore((s) => s.lastResolution);
  const currentCountry = useGameStore((s) => s.currentCountry);
  const lastClickedCountryName = useGameStore((s) => s.lastClickedCountryName);
  const nextCountry = useGameStore((s) => s.nextCountry);

  useEffect(() => {
    if (phase !== "feedback") return;

    const timer = setTimeout(() => {
      nextCountry();
    }, GAME_CONFIG.feedbackDuration);

    return () => clearTimeout(timer);
  }, [phase, nextCountry]);

  if (phase !== "feedback" || !currentCountry) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div className="animate-fade-in-up text-center">
        {isCorrect ? (
          <>
            <p
              className={`text-3xl md:text-4xl font-bold ${
                lastResolution === "perfect"
                  ? "text-emerald"
                  : "text-yellow-400"
              }`}
            >
              {lastResolution === "perfect" ? "Perfect!" : "Correct!"}
            </p>
          </>
        ) : (
          <p className="text-error text-3xl md:text-4xl font-bold">Incorrect</p>
        )}
      </div>
    </div>
  );
}
