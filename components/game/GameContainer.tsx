"use client";

import { useMemo, useCallback, useEffect, useState, useRef } from "react";
import GlobeDynamic from "@/components/globe/GlobeDynamic";
import CountryPrompt from "./CountryPrompt";
import TriesIndicator from "./TriesIndicator";
import ScoreBoard from "./ScoreBoard";
import ResultFeedback from "./ResultFeedback";
import ClickFeedback from "./ClickFeedback";
import StartScreen from "./start/StartScreen";
import GameOver from "./game-over/GameOver";
import PauseMenu from "./PauseMenu";
import CountdownTimer from "./CountdownTimer";
import DebugStats from "./DebugStats";
import LoadingScreen from "./LoadingScreen";
import MenuButton from "./MenuButton";
import { RaceOverlay, useRaceGlobe } from "@/components/race/RaceMode";
import SoundDirector from "@/components/sound/SoundDirector";
import { play } from "@/lib/sound/engine";

import { useGameStore } from "@/lib/store/game-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { useHydrated } from "@/lib/hooks/useHydrated";
import {
  getAllFeatures,
  getGuessableCountries,
  baseId,
} from "@/lib/geo/countries";
import { idsFor, seedFor } from "@/lib/geo/draws";
import { randomSeed } from "@/lib/engine/rng";
import { GAME_CONFIG, GLOBE_CONFIG } from "@/lib/constants";

export type GameMode = "solo" | "race";

/**
 * Race mode has no wrong guesses of its own. A module constant, not an inline
 * `[]`: the globe repaints its fill texture whenever this prop's identity
 * changes, and an inline literal changes on every render.
 */
const NO_WRONG_GUESSES: string[] = [];

interface GameContainerProps {
  initialMode?: GameMode;
  /** Room code from an invite link; only meaningful with `initialMode="race"`. */
  initialRoom?: string;
}

export default function GameContainer({
  initialMode = "solo",
  initialRoom = "",
}: GameContainerProps) {
  // One globe for both modes: switching modes swaps overlays and globe props,
  // never the canvas, so the scene and camera carry over without a reload.
  const [mode, setMode] = useState<GameMode>(initialMode);
  const raceGlobe = useRaceGlobe();

  // The URL mirrors the mode so a refresh or a shared link lands in the same
  // place, without a route change (which would remount the canvas).
  const enterRace = useCallback(() => {
    window.history.pushState(null, "", "/race");
    setMode("race");
  }, []);
  const exitRace = useCallback(() => {
    window.history.replaceState(null, "", "/");
    setMode("solo");
  }, []);
  useEffect(() => {
    const onPop = () =>
      setMode(window.location.pathname === "/race" ? "race" : "solo");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const [isPaused, setIsPaused] = useState(false);
  // The pause menu's controls sub-panel. Lives here, not in PauseMenu, so the
  // Escape handler below can close it before it reaches for resume.
  const [showPauseSettings, setShowPauseSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const lastPauseToggle = useRef<number>(0);
  const hydrated = useHydrated();

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
  const gameExpertMode = useGameStore((s) => s.expertMode);
  const lastResolution = useGameStore((s) => s.lastResolution);
  const gameEndedAt = useGameStore((s) => s.gameEndedAt);

  const countrySetId = useSettingsStore((s) => s.countrySet);
  const expertMode = useSettingsStore((s) => s.expertMode);
  const allowSkips = useSettingsStore((s) => s.allowSkips);
  const showHints = useSettingsStore((s) => s.showHints);
  const timerLimit = useSettingsStore((s) => s.timerLimit);
  const maxTries = useSettingsStore((s) => s.maxTries);
  const zoomSpeed = useSettingsStore((s) => s.zoomSpeed);
  const rotateSpeed = useSettingsStore((s) => s.rotateSpeed);

  const pauseTimer = useGameStore((s) => s.pauseTimer);
  const resumeTimer = useGameStore((s) => s.resumeTimer);

  const allFeatures = useMemo(() => getAllFeatures(), []);
  const guessableCountries = useMemo(() => getGuessableCountries(), []);

  // The game starts with its clock held (engine paused) until the camera's
  // intro flight lands — the timer never eats into the fly-in.
  const [isIntroFlying, setIsIntroFlying] = useState(false);

  // One run. The seed decides the countries — fixed sets ignore it, draws
  // sample by it, and Daily 20 pins it to the UTC date — and the engine keeps
  // it, so the same seed replays the same game anywhere.
  const beginRun = useCallback(() => {
    const seed = seedFor(countrySetId, randomSeed());
    const ids = new Set(idsFor(countrySetId, seed));
    const picked = guessableCountries.filter((c) => ids.has(c.id));
    startGame(
      picked.length > 0 ? picked : guessableCountries,
      { countrySetId, expertMode, timerLimit, maxTries },
      seed,
    );
    pauseTimer();
    setIsIntroFlying(true);
    setIsPaused(false);
  }, [
    startGame,
    pauseTimer,
    guessableCountries,
    countrySetId,
    expertMode,
    timerLimit,
    maxTries,
  ]);

  const handlePlayAgain = useCallback(() => {
    resetGame();
    beginRun();
  }, [resetGame, beginRun]);

  const handleIntroArrived = useCallback(() => {
    setIsIntroFlying(false);
  }, []);

  // Failsafe: never leave the clock held if the arrival signal goes missing
  useEffect(() => {
    if (!isIntroFlying) return;
    const timer = setTimeout(
      () => setIsIntroFlying(false),
      (GLOBE_CONFIG.cameraFlightMaxDuration + 1.5) * 1000,
    );
    return () => clearTimeout(timer);
  }, [isIntroFlying]);

  // Run the clock exactly when nothing holds it: no intro flight, no pause
  // menu. resumeTimer/pauseTimer are no-ops when already in that state.
  useEffect(() => {
    if (phase !== "playing") return;
    if (!isIntroFlying && !isPaused) {
      resumeTimer();
    }
  }, [phase, isIntroFlying, isPaused, resumeTimer]);

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

  const togglePause = useCallback(() => {
    // Debounce: only allow toggle if at least 300ms has passed since last press
    const now = Date.now();
    if (now - lastPauseToggle.current < 300) {
      return;
    }
    lastPauseToggle.current = now;

    setIsPaused((p) => {
      const newPaused = !p;
      if (newPaused) {
        pauseTimer();
      } else {
        resumeTimer();
      }
      return newPaused;
    });
    // Either direction lands on the top level of the menu, so the controls
    // panel is never still open the next time it opens.
    setShowPauseSettings(false);
  }, [pauseTimer, resumeTimer]);

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
      if (
        (phase !== "playing" && phase !== "mustclick") ||
        isPaused ||
        isIntroFlying
      )
        return;

      const currentCountry = useGameStore.getState().currentCountry;
      const base = baseId(countryId);

      // Ignore clicks on countries outside the active game set
      if (!validCountryIds.has(base)) return;

      const isCorrectGuess =
        currentCountry !== null && base === currentCountry.id;

      // Show floating labels when hints are enabled, for every click that is
      // not the sought country: new wrong guesses, and reviews of countries
      // already resolved or already guessed wrong
      if (showHints && !isCorrectGuess) {
        const feature = allFeatures.find((f) => baseId(f.id) === base);
        if (feature) {
          addFloatingLabel(feature.properties.name, position);
        }
      }

      makeGuess(base);
    },
    [
      phase,
      isPaused,
      isIntroFlying,
      makeGuess,
      allFeatures,
      addFloatingLabel,
      showHints,
      validCountryIds,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key toggles pause during gameplay
      if (
        e.key === "Escape" &&
        (phase === "playing" || phase === "feedback" || phase === "mustclick")
      ) {
        e.preventDefault();
        // One step back at a time: out of the controls panel first, and only
        // then out of the pause menu.
        if (isPaused && showPauseSettings) {
          play("ui.click");
          setShowPauseSettings(false);
        } else {
          play(isPaused ? "ui.click" : "ui.open");
          togglePause();
        }
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
  }, [
    phase,
    isPaused,
    showPauseSettings,
    goNext,
    goPrev,
    allowSkips,
    togglePause,
  ]);

  const isGameActive =
    phase === "playing" || phase === "feedback" || phase === "mustclick";

  // Expert loss reveal: before showing the results card, the camera flies to
  // the missed country (which pulses on the globe) so the player learns where
  // it was. The card appears a short hold after the flight actually settles
  // (onRevealArrived), with a max-wait cap in case the flight never does.
  // Purely presentational — the engine is already in "gameover".
  const isExpertLoss =
    phase === "gameover" && gameExpertMode && lastResolution === "failed";
  const [revealArrivedAt, setRevealArrivedAt] = useState<number | null>(null);
  const handleRevealArrived = useCallback(() => {
    setRevealArrivedAt(Date.now());
  }, []);

  // An arrival stamped before this game ended belongs to a previous reveal
  const hasArrived =
    revealArrivedAt !== null &&
    gameEndedAt !== null &&
    revealArrivedAt >= gameEndedAt;
  const revealEndsAt =
    isExpertLoss && gameEndedAt !== null
      ? hasArrived
        ? Math.min(
            revealArrivedAt + GAME_CONFIG.expertRevealHold,
            gameEndedAt + GAME_CONFIG.expertRevealMaxWait,
          )
        : gameEndedAt + GAME_CONFIG.expertRevealMaxWait
      : null;
  const [revealClock, setRevealClock] = useState(0);
  const isRevealing = revealEndsAt !== null && revealClock < revealEndsAt;

  useEffect(() => {
    if (revealEndsAt === null) return;
    const timer = setTimeout(
      () => setRevealClock(revealEndsAt),
      Math.max(0, revealEndsAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [revealEndsAt]);

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-ground">
      <SoundDirector />
      {isLoading && <LoadingScreen />}

      <div
        className={`absolute inset-0 transition-opacity duration-300 ${showContent ? "opacity-100" : "opacity-0"}`}
      >
        {mode === "race" ? (
          <GlobeDynamic
            features={allFeatures}
            wrongGuessIds={NO_WRONG_GUESSES}
            resolvedCountries={raceGlobe.resolvedCountries}
            interactive={raceGlobe.interactive}
            autoRotate={raceGlobe.autoRotate}
            onCountryClick={raceGlobe.onCountryClick}
            onReady={handleGlobeReady}
            zoomSpeed={zoomSpeed}
            rotateSpeed={rotateSpeed}
            hoverFilled={raceGlobe.hoverFilled}
            scene={raceGlobe.scene}
          />
        ) : (
          <GlobeDynamic
            features={allFeatures}
            wrongGuessIds={wrongGuessIds}
            resolvedCountries={resolvedCountries}
            interactive={
              (phase === "playing" || phase === "mustclick") &&
              !isPaused &&
              !isIntroFlying
            }
            autoRotate={
              phase === "idle" || (phase === "gameover" && !isExpertLoss)
            }
            onCountryClick={handleCountryClick}
            onReady={handleGlobeReady}
            onIntroArrived={handleIntroArrived}
            onRevealArrived={handleRevealArrived}
            zoomSpeed={zoomSpeed}
            rotateSpeed={rotateSpeed}
            hoverFilled={showHints}
          />
        )}
      </div>

      {mode === "race" && (
        <div
          className={`transition-opacity duration-300 ${showContent ? "opacity-100" : "opacity-0"}`}
        >
          <RaceOverlay initialRoom={initialRoom} onExit={exitRace} />
        </div>
      )}

      {/* Solo HUD and menus unmount entirely in race mode: a hidden start
          screen would still own the Enter shortcut. */}
      {mode === "solo" && (
        <div
          className={`transition-opacity duration-300 ${showContent ? "opacity-100" : "opacity-0"}`}
        >
          <CountryPrompt />
          <CountdownTimer />
          <ScoreBoard />
          <TriesIndicator />
          <ClickFeedback />
          <ResultFeedback />
          {isGameActive && <MenuButton onClick={togglePause} />}
          <DebugStats />

          {/* Persisted stores hydrate on the client; render dependent UI after */}
          {hydrated && phase === "idle" && (
            <StartScreen
              onStart={beginRun}
              onRace={enterRace}
              delayAnimation={isInitialLoad}
            />
          )}
          {hydrated && phase === "gameover" && !isRevealing && (
            <GameOver
              onPlayAgain={handlePlayAgain}
              onMainMenu={handleMainMenu}
            />
          )}
          {isPaused && isGameActive && (
            <PauseMenu
              onResume={handleResume}
              onRestart={handlePlayAgain}
              onMainMenu={handleForfeit}
              showSettings={showPauseSettings}
              onOpenSettings={() => setShowPauseSettings(true)}
              onCloseSettings={() => setShowPauseSettings(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
