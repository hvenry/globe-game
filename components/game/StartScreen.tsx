"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStatsStore } from "@/lib/store/stats-store";

interface StartScreenProps {
  onStart: () => void;
}

export default function StartScreen({ onStart }: StartScreenProps) {
  const [hydrated, setHydrated] = useState(false);
  const { gamesPlayed, bestScore } = useStatsStore();

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <div className="animate-fade-in-up bg-black/70 backdrop-blur-md border border-white/10 rounded-2xl p-8 md:p-12 text-center max-w-sm mx-4">
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
          GLOBE
        </h1>
        <p className="text-white/40 text-sm mt-2 mb-8">
          Test your geography
        </p>

        {hydrated && gamesPlayed > 0 && (
          <div className="mb-8">
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/40 text-xs uppercase tracking-wider">
                Best Accuracy
              </p>
              <p className="text-emerald text-xl font-bold tabular-nums">
                {bestScore}%
              </p>
            </div>
          </div>
        )}

        <Button
          onClick={onStart}
          className="bg-emerald hover:bg-emerald/90 text-black font-semibold px-8 py-3 text-lg rounded-xl w-full cursor-pointer"
        >
          Start
        </Button>
      </div>
    </div>
  );
}
