"use client";

import { useGameStore } from "@/lib/store/game-store";

export default function CountryPrompt() {
  const phase = useGameStore((s) => s.phase);
  const currentCountry = useGameStore((s) => s.currentCountry);
  const questionsAnswered = useGameStore((s) => s.questionsAnswered);
  const countryPool = useGameStore((s) => s.countryPool);

  if ((phase !== "playing" && phase !== "feedback") || !currentCountry)
    return null;

  const total = questionsAnswered + countryPool.length + (phase === "playing" ? 1 : 0);
  const current = questionsAnswered + (phase === "playing" ? 1 : 0);

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
      <div
        key={currentCountry.id}
        className="animate-fade-in-up bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl px-6 py-3 text-center"
      >
        <p className="text-white/50 text-xs mb-1 tracking-wider uppercase">
          Find this country
        </p>
        <p className="text-white text-lg md:text-2xl font-semibold">
          {currentCountry.name}
        </p>
        <p className="text-white/30 text-xs mt-1 tabular-nums">
          {current} / {total}
        </p>
      </div>
    </div>
  );
}
