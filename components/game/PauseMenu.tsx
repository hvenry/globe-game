"use client";

import { useGameStore } from "@/lib/store/game-store";
import { useStatsStore } from "@/lib/store/stats-store";
import { formatScore } from "@/lib/utils";
import ScoreCard, { countResolutions } from "./ResolutionBreakdown";
import ControlsSection from "./settings/ControlsSection";
import { ChevronLeftIcon, SlidersIcon } from "@/components/ui/icons";
import { usePinchZoomLock } from "@/lib/hooks/usePinchZoomLock";

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  /** Controls sub-panel. Owned by GameContainer so Escape can close it first. */
  showSettings: boolean;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
}

export default function PauseMenu({
  onResume,
  onRestart,
  onMainMenu,
  showSettings,
  onOpenSettings,
  onCloseSettings,
}: PauseMenuProps) {
  // A menu, not the globe: pinching it should do nothing rather than zoom
  // the scene behind an opaque panel.
  usePinchZoomLock();

  const questionsAnswered = useGameStore((s) => s.questionsAnswered);
  const totalPoints = useGameStore((s) => s.totalPoints);
  const totalCountries = useGameStore((s) => s.totalCountries);
  const triesRemaining = useGameStore((s) => s.triesRemaining);
  const maxTries = useGameStore((s) => s.maxTries);
  const resolvedCountries = useGameStore((s) => s.resolvedCountries);
  const expertMode = useGameStore((s) => s.expertMode);
  const countrySetId = useGameStore((s) => s.countrySetId);
  const bestScores = useStatsStore((s) => s.bestScores);

  // Running average capped at last feedback score so it never jumps UP when a
  // new question starts with full tries
  const scoreRaw = questionsAnswered === 0
    ? 0
    : Math.min(
        totalPoints / questionsAnswered,
        (totalPoints + triesRemaining / maxTries) / (questionsAnswered + 1)
      );
  const scoreDisplay = formatScore(scoreRaw);

  const { perfect, almost, failed } = countResolutions(resolvedCountries);
  const progress = Math.round((questionsAnswered / totalCountries) * 100);

  const previousBestRaw = bestScores[countrySetId] || 0;
  const previousBestPct =
    totalCountries > 0 ? formatScore(previousBestRaw / totalCountries) : "0";

  const channel = expertMode ? "text-expert-ink" : "text-signal";

  return (
    <div className="veil absolute inset-0 z-40 flex items-center justify-center">
      <div className="panel panel-ticks panel-dialog animate-fade-in-up text-center">
        {showSettings ? (
          <div className="space-y-6 text-left">
            <div className="flex items-center justify-between">
              <button
                onClick={onCloseSettings}
                aria-label="Back"
                className="btn-icon press"
              >
                <ChevronLeftIcon size={13} />
              </button>
              <h2 className="hud-label text-mid">Controls</h2>
              {/* Balances the back button so the title stays centred. */}
              <div className="h-7 w-7" />
            </div>

            <ControlsSection expertMode={expertMode} />

            {/* The rest of settings decides the shape of a game, so it stays
                where a game is started. */}
            <p className="text-center text-label text-faint">
              Game options live on the main menu
            </p>
          </div>
        ) : (
          <div className="stagger">
          <button
            onClick={onOpenSettings}
            aria-label="Controls"
            className="btn-icon press absolute right-3 top-3 md:right-4 md:top-4"
          >
            <SlidersIcon size={13} />
          </button>
          <p className={`hud-label ${channel}`}>Paused</p>
          <p className="mt-1 text-label text-faint tracking-[0.18em] uppercase">
            Press esc to resume
          </p>

          {/* Progress */}
          <div className="mt-5 space-y-2 md:mt-6">
            <p className="readout text-xl font-medium text-hi md:text-2xl">
              {questionsAnswered}
              <span className="mx-1 text-faint">/</span>
              {totalCountries}
            </p>
            <div className="progress-track">
              <div
                className={`h-1 rounded-full transition-all ${
                  expertMode ? "bg-expert" : "bg-signal"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Score + breakdown (normal mode) */}
          {!expertMode && (
            <div className="mt-4 space-y-2 md:mt-5 md:space-y-2.5">
              <div className="flex items-end justify-between rounded-control border border-hairline bg-well p-2.5 md:p-3">
                <div className="text-left">
                  <p className="hud-label">Best</p>
                  <p className="readout mt-0.5 text-base font-medium text-low md:text-lg">
                    {previousBestPct}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="hud-label">Score</p>
                  <p className="readout mt-0.5 text-xl font-medium text-hi md:text-2xl">
                    {scoreDisplay}%
                  </p>
                </div>
              </div>
              <ScoreCard perfect={perfect} almost={almost} failed={failed} />
            </div>
          )}

          <div className="mt-6 space-y-2 md:mt-7 md:space-y-2.5">
            <button
              onClick={onResume}
              className={`btn-primary ${
                expertMode
                  ? "btn-expert hover:brightness-110 hover:shadow-[0_0_24px_rgb(var(--expert)/0.35)]"
                  : "btn-signal hover:brightness-110 hover:shadow-[0_0_24px_rgb(var(--signal)/0.4)]"
              }`}
            >
              Resume
            </button>
            <button
              onClick={onRestart}
              className="btn-ghost"
            >
              Restart
            </button>
            <button
              onClick={onMainMenu}
              className="btn-quiet"
            >
              Quit game
            </button>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
