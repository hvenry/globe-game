"use client";

import { useMemo, useCallback, useEffect } from "react";
import GlobeDynamic from "@/components/globe/GlobeDynamic";
import CountryPrompt from "./CountryPrompt";
import TriesIndicator from "./TriesIndicator";
import ScoreBoard from "./ScoreBoard";
import ResultFeedback from "./ResultFeedback";
import ClickFeedback from "./ClickFeedback";
import StartScreen from "./StartScreen";
import GameOver from "./GameOver";
import { useGameStore } from "@/lib/store/game-store";
import { getAllFeatures, getGuessableCountries, baseId } from "@/lib/geo/countries";

export default function GameContainer() {
  const phase = useGameStore((s) => s.phase);
  const wrongGuessIds = useGameStore((s) => s.wrongGuessIds);
  const resolvedCountries = useGameStore((s) => s.resolvedCountries);
  const startGame = useGameStore((s) => s.startGame);
  const makeGuess = useGameStore((s) => s.makeGuess);
  const resetGame = useGameStore((s) => s.resetGame);
  const addFloatingLabel = useGameStore((s) => s.addFloatingLabel);
  const goNext = useGameStore((s) => s.goNext);
  const goPrev = useGameStore((s) => s.goPrev);

  const allFeatures = useMemo(() => getAllFeatures(), []);
  const guessableCountries = useMemo(() => getGuessableCountries(), []);

  const handleStart = useCallback(() => {
    startGame(guessableCountries);
  }, [startGame, guessableCountries]);

  const handlePlayAgain = useCallback(() => {
    resetGame();
    startGame(guessableCountries);
  }, [resetGame, startGame, guessableCountries]);

  const handleCountryClick = useCallback(
    (countryId: string, position: [number, number, number]) => {
      if (phase !== "playing") return;

      // Show floating label with country name
      const base = baseId(countryId);
      const feature = allFeatures.find((f) => baseId(f.id) === base);
      if (feature) {
        addFloatingLabel(feature.properties.name, position);
      }

      makeGuess(countryId);
    },
    [phase, makeGuess, allFeatures, addFloatingLabel]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== "playing") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, goNext, goPrev]);

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-black">
      <div className="absolute inset-0">
        <GlobeDynamic
          features={allFeatures}
          wrongGuessIds={wrongGuessIds}
          resolvedCountries={resolvedCountries}
          interactive={phase === "playing"}
          autoRotate={phase === "idle" || phase === "gameover"}
          onCountryClick={handleCountryClick}
        />
      </div>

      <CountryPrompt />
      <ScoreBoard />
      <TriesIndicator />
      <ClickFeedback />
      <ResultFeedback />

      {phase === "idle" && <StartScreen onStart={handleStart} />}
      {phase === "gameover" && <GameOver onPlayAgain={handlePlayAgain} />}
    </div>
  );
}
