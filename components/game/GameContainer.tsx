"use client";

import { useMemo, useCallback, useEffect, useState } from "react";
import GlobeDynamic from "@/components/globe/GlobeDynamic";
import CountryPrompt from "./CountryPrompt";
import TriesIndicator from "./TriesIndicator";
import ScoreBoard from "./ScoreBoard";
import ResultFeedback from "./ResultFeedback";
import ClickFeedback from "./ClickFeedback";
import StartScreen from "./StartScreen";
import GameOver from "./GameOver";
import PauseMenu from "./PauseMenu";
import CountdownTimer from "./CountdownTimer";
import LoadingScreen from "./LoadingScreen";
import { useGameStore } from "@/lib/store/game-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { getAllFeatures, getGuessableCountries, baseId } from "@/lib/geo/countries";
import { getCountrySet } from "@/lib/geo/country-sets";

export default function GameContainer() {
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const phase = useGameStore((s) => s.phase);
  const wrongGuessIds = useGameStore((s) => s.wrongGuessIds);
  const resolvedCountries = useGameStore((s) => s.resolvedCountries);
  const startGame = useGameStore((s) => s.startGame);
  const makeGuess = useGameStore((s) => s.makeGuess);
  const resetGame = useGameStore((s) => s.resetGame);
  const addFloatingLabel = useGameStore((s) => s.addFloatingLabel);
  const goNext = useGameStore((s) => s.goNext);
  const goPrev = useGameStore((s) => s.goPrev);
  const forfeitGame = useGameStore((s) => s.forfeitGame);
  const validCountryIds = useGameStore((s) => s.validCountryIds);

  const countrySetId = useSettingsStore((s) => s.countrySet);
  const expertMode = useSettingsStore((s) => s.expertMode);
  const allowSkips = useSettingsStore((s) => s.allowSkips);
  const showHints = useSettingsStore((s) => s.showHints);
  const timerLimit = useSettingsStore((s) => s.timerLimit);
  const zoomSpeed = useSettingsStore((s) => s.zoomSpeed);
  const rotateSpeed = useSettingsStore((s) => s.rotateSpeed);

  const pauseTimer = useGameStore((s) => s.pauseTimer);
  const resumeTimer = useGameStore((s) => s.resumeTimer);

  const allFeatures = useMemo(() => getAllFeatures(), []);
  const guessableCountries = useMemo(() => getGuessableCountries(), []);

  const filteredCountries = useMemo(() => {
    const set = getCountrySet(countrySetId);
    if (!set.countryIds) {
      return guessableCountries;
    }
    const idSet = new Set(set.countryIds);
    return guessableCountries.filter((c) => idSet.has(c.id));
  }, [countrySetId, guessableCountries]);

  const handleStart = useCallback(() => {
    const countries = filteredCountries.length > 0 ? filteredCountries : guessableCountries;
    startGame(countries, countrySetId, expertMode, timerLimit);
    setIsPaused(false);
  }, [startGame, filteredCountries, guessableCountries, countrySetId, expertMode, timerLimit]);

  const handlePlayAgain = useCallback(() => {
    resetGame();
    const countries = filteredCountries.length > 0 ? filteredCountries : guessableCountries;
    startGame(countries, countrySetId, expertMode, timerLimit);
    setIsPaused(false);
  }, [resetGame, startGame, filteredCountries, guessableCountries, countrySetId, expertMode, timerLimit]);

  const handleMainMenu = useCallback(() => {
    resetGame();
    setIsPaused(false);
  }, [resetGame]);

  const handleForfeit = useCallback(() => {
    setIsPaused(false);
    forfeitGame();
  }, [forfeitGame]);

  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const handleGlobeReady = useCallback(() => {
    setIsLoading(false);
    // Fade in content after a brief moment
    setTimeout(() => {
      setShowContent(true);
      // Mark that initial load is complete after fade-in finishes
      setTimeout(() => {
        setIsInitialLoad(false);
      }, 300);
    }, 50);
  }, []);

  const handleCountryClick = useCallback(
    (countryId: string, position: [number, number, number]) => {
      if (phase !== "playing" || isPaused) return;

      const currentCountry = useGameStore.getState().currentCountry;
      const base = baseId(countryId);

      // Ignore clicks on countries outside the active game set
      if (!validCountryIds.has(base)) return;

      const isCorrectGuess = currentCountry && base === currentCountry.id;
      const isAlreadyResolved = resolvedCountries.has(base);
      const isAlreadyWrongGuess = wrongGuessIds.has(base);

      // Show floating label when hints are enabled for:
      // 1. Already resolved countries (allows user to review what they got)
      // 2. Already incorrectly guessed countries (allows user to review their mistakes)
      // 3. New incorrect guesses
      const shouldShowLabel = showHints && (
        isAlreadyResolved ||
        isAlreadyWrongGuess ||
        !isCorrectGuess
      );

      if (shouldShowLabel) {
        const feature = allFeatures.find((f) => baseId(f.id) === base);
        if (feature) {
          addFloatingLabel(feature.properties.name, position);
        }
      }

      makeGuess(countryId);
    },
    [phase, isPaused, makeGuess, allFeatures, addFloatingLabel, showHints, resolvedCountries, wrongGuessIds, validCountryIds]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key toggles pause during gameplay
      if (e.key === "Escape" && (phase === "playing" || phase === "feedback")) {
        e.preventDefault();
        setIsPaused((p) => {
          const newPaused = !p;
          if (newPaused) {
            pauseTimer();
          } else {
            resumeTimer();
          }
          return newPaused;
        });
        return;
      }

      // Arrow keys for navigation (only when not paused and skips allowed)
      if (phase !== "playing" || isPaused || !allowSkips) return;
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
  }, [phase, isPaused, goNext, goPrev, allowSkips, pauseTimer, resumeTimer]);

  const isGameActive = phase === "playing" || phase === "feedback";

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-black">
      {isLoading && <LoadingScreen />}

      <div className={`absolute inset-0 transition-opacity duration-300 ${showContent ? "opacity-100" : "opacity-0"}`}>
        <GlobeDynamic
          features={allFeatures}
          wrongGuessIds={wrongGuessIds}
          resolvedCountries={resolvedCountries}
          interactive={phase === "playing" && !isPaused}
          autoRotate={phase === "idle" || phase === "gameover"}
          onCountryClick={handleCountryClick}
          onReady={handleGlobeReady}
          zoomSpeed={zoomSpeed}
          rotateSpeed={rotateSpeed}
        />
      </div>

      <div className={`transition-opacity duration-300 ${showContent ? "opacity-100" : "opacity-0"}`}>
        <CountryPrompt />
        <CountdownTimer />
        <ScoreBoard />
        <TriesIndicator />
        <ClickFeedback />
        <ResultFeedback />

        {phase === "idle" && <StartScreen onStart={handleStart} delayAnimation={isInitialLoad} />}
        {phase === "gameover" && (
          <GameOver onPlayAgain={handlePlayAgain} onMainMenu={handleMainMenu} />
        )}
        {isPaused && isGameActive && (
          <PauseMenu
            onResume={handleResume}
            onRestart={handlePlayAgain}
            onMainMenu={handleForfeit}
          />
        )}
      </div>
    </div>
  );
}
