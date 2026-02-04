"use client";

import { useEffect, useState, useCallback } from "react";
import { useGameStore } from "@/lib/store/game-store";
import { GAME_CONFIG } from "@/lib/constants";

export default function ResultFeedback() {
  const phase = useGameStore((s) => s.phase);
  const isCorrect = useGameStore((s) => s.isCorrect);
  const lastResolution = useGameStore((s) => s.lastResolution);
  const currentCountry = useGameStore((s) => s.currentCountry);
  const nextCountry = useGameStore((s) => s.nextCountry);

  const [showMustclickFeedback, setShowMustclickFeedback] = useState(false);

  // Show feedback overlay when entering mustclick, hide when leaving
  useEffect(() => {
    if (phase !== "mustclick") return;
    const id = requestAnimationFrame(() => setShowMustclickFeedback(true));
    return () => {
      cancelAnimationFrame(id);
      setShowMustclickFeedback(false);
    };
  }, [phase]);

  const handleAnimationEnd = useCallback(() => {
    setShowMustclickFeedback(false);
  }, []);

  // Auto-advance after feedback duration for normal feedback phase
  useEffect(() => {
    if (phase !== "feedback") return;

    const timer = setTimeout(() => {
      nextCountry();
    }, GAME_CONFIG.feedbackDuration);

    return () => clearTimeout(timer);
  }, [phase, nextCountry]);

  const showFeedback = phase === "feedback" && currentCountry;
  const showMustclick = showMustclickFeedback && phase === "mustclick" && currentCountry;
  const isMustclick = showMustclick && !showFeedback;

  if (!showFeedback && !showMustclick) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center pb-24 md:pb-32 pointer-events-none">
      <div
        className={`${isMustclick ? "animate-fade-in-out-up" : "animate-fade-in-up"} text-center`}
        onAnimationEnd={isMustclick ? handleAnimationEnd : undefined}
      >
        {isCorrect ? (
          <p
            className={`text-3xl md:text-4xl font-bold ${
              lastResolution === "perfect"
                ? "text-emerald"
                : "text-yellow-400"
            }`}
          >
            {lastResolution === "perfect" ? "Perfect!" : "Correct!"}
          </p>
        ) : (
          <p className="text-error text-3xl md:text-4xl font-bold">Incorrect</p>
        )}
      </div>
    </div>
  );
}
