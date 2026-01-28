"use client";

import { useGameStore } from "@/lib/store/game-store";

export default function SkipButton() {
  const { phase, makeGuess } = useGameStore();

  if (phase !== "playing") return null;

  const handleSkip = () => {
    // Force an incorrect answer by exhausting tries with a dummy ID
    makeGuess("__skip__");
    makeGuess("__skip__");
    makeGuess("__skip__");
  };

  return (
    <div className="absolute bottom-8 right-6 z-10">
      <button
        onClick={handleSkip}
        className="text-white/30 hover:text-white/60 text-sm transition-colors duration-200 cursor-pointer"
      >
        Skip
      </button>
    </div>
  );
}
