"use client";

import { useGameStore } from "@/lib/store/game-store";
import { useSettingsStore } from "@/lib/store/settings-store";

export default function CountryPrompt() {
  const phase = useGameStore((s) => s.phase);
  const currentCountry = useGameStore((s) => s.currentCountry);
  const questionsAnswered = useGameStore((s) => s.questionsAnswered);
  const totalCountries = useGameStore((s) => s.totalCountries);
  const unansweredCountries = useGameStore((s) => s.unansweredCountries);
  const goNext = useGameStore((s) => s.goNext);
  const goPrev = useGameStore((s) => s.goPrev);
  const allowSkips = useSettingsStore((s) => s.allowSkips);

  if ((phase !== "playing" && phase !== "feedback") || !currentCountry)
    return null;

  const current = questionsAnswered + 1;
  const showArrows = allowSkips && phase === "playing" && unansweredCountries.length > 1;

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
      <div
        key={currentCountry.id}
        className="animate-fade-in-up bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl px-6 py-3 text-center"
      >
        <p className="text-white/50 text-xs mb-1 tracking-wider uppercase">
          Find this country
        </p>
        <div className="flex items-center gap-3">
          {showArrows ? (
            <button
              onClick={goPrev}
              className="text-white/30 hover:text-white/70 transition-colors duration-200 cursor-pointer p-1"
              aria-label="Previous country"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <span className="w-[24px]" />
          )}
          <p className="text-white text-lg md:text-2xl font-semibold">
            {currentCountry.name}
          </p>
          {showArrows ? (
            <button
              onClick={goNext}
              className="text-white/30 hover:text-white/70 transition-colors duration-200 cursor-pointer p-1"
              aria-label="Next country"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <span className="w-[24px]" />
          )}
        </div>
        <p className="text-white/30 text-xs mt-1 tabular-nums">
          {current} / {totalCountries}
        </p>
      </div>
    </div>
  );
}
