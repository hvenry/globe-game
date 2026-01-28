"use client";

import { useMemo, useCallback } from "react";
import GlobeDynamic from "@/components/globe/GlobeDynamic";
import CountryPrompt from "./CountryPrompt";
import TriesIndicator from "./TriesIndicator";
import ScoreBoard from "./ScoreBoard";
import ResultFeedback from "./ResultFeedback";
import ClickFeedback from "./ClickFeedback";
import StartScreen from "./StartScreen";
import GameOver from "./GameOver";
import SkipButton from "./SkipButton";
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
      <SkipButton />
      <ClickFeedback />
      <ResultFeedback />

      {phase === "idle" && <StartScreen onStart={handleStart} />}
      {phase === "gameover" && <GameOver onPlayAgain={handlePlayAgain} />}
    </div>
  );
}
