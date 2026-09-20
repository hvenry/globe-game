"use client";

import { useCallback } from "react";
import { useStatsStore } from "@/lib/store/stats-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { useCopied } from "@/lib/hooks/useCopied";
import { getCountrySet } from "@/lib/geo/country-sets";
import { GUESSABLE_IDS } from "@/lib/geo/country-names";
import { SlidersIcon, UsersIcon } from "@/components/ui/icons";
import BestScoresCard from "./BestScoresCard";

interface MainMenuProps {
  onStart: () => void;
  onRace: () => void;
  /** The section to open on; the country-set cell asks for its own. */
  onOpenSettings: () => void;
  onOpenCountrySet: () => void;
  delayAnimation: boolean;
  expertMode: boolean;
}

export default function MainMenu({
  onStart,
  onRace,
  onOpenSettings,
  onOpenCountrySet,
  delayAnimation,
  expertMode,
}: MainMenuProps) {
  const bestScores = useStatsStore((s) => s.bestScores);
  const expertBestScores = useStatsStore((s) => s.expertBestScores);
  const countrySet = useSettingsStore((s) => s.countrySet);
  const setExpertMode = useSettingsStore((s) => s.setExpertMode);
  const { copied, copy } = useCopied();

  const handleShare = useCallback(() => {
    if (copied) return;

    const allTotal = GUESSABLE_IDS.size;
    const normalPercentage = Math.floor((bestScores.all / allTotal) * 100);
    const expertPercentage = Math.floor(
      (expertBestScores.all / allTotal) * 100,
    );

    const makeBar = (percent: number, size = 10) => {
      const clamped = Math.max(0, Math.min(100, percent));
      const filled =
        clamped === 100 ? size : Math.floor((clamped / 100) * size);
      return "█".repeat(filled) + "░".repeat(size - filled);
    };

    let message = "My high score on https://globe.expert";

    if (expertBestScores.all > 0 && bestScores.all > 0) {
      message +=
        `\nExpert  [${makeBar(expertPercentage)}] ${expertPercentage}%` +
        `\nNormal  [${makeBar(normalPercentage)}] ${normalPercentage}%`;
    } else if (expertBestScores.all > 0) {
      message += `\nExpert  [${makeBar(expertPercentage)}] ${expertPercentage}%`;
    } else {
      message += `\nNormal  [${makeBar(normalPercentage)}] ${normalPercentage}%`;
    }

    copy(message);
  }, [bestScores.all, expertBestScores.all, copied, copy]);

  const hasScores = bestScores.all > 0 || expertBestScores.all > 0;
  const countrySetName = getCountrySet(countrySet).name;

  const channel = expertMode ? "text-expert-ink" : "text-signal";
  const channelDot = expertMode ? "bg-expert" : "bg-signal";

  return (
    <div className="stagger space-y-5 md:space-y-7">
      {/* Wordmark */}
      <div className="text-center">
        {/* The dot is an element, not a period: a glyph that small is mostly
            antialiased edge, so it renders visibly duller than the same color
            used as a solid fill elsewhere. */}
        <h1
          aria-label="globe.expert"
          className="text-[1.75rem] font-bold tracking-tight text-hi md:text-[2.75rem]"
        >
          globe
          <span
            aria-hidden="true"
            className={`mx-[0.05em] inline-block size-[0.15em] rounded-full align-baseline ${channelDot}`}
          />
          expert
        </h1>
      </div>

      {/* Best scores readout */}
      {hasScores && (
        <BestScoresCard
          bestScores={bestScores}
          expertBestScores={expertBestScores}
          allTotal={GUESSABLE_IDS.size}
          delayAnimation={delayAnimation}
          onShare={handleShare}
          copied={copied}
        />
      )}

      {/* Mode + country set controls */}
      <div className="grid grid-cols-2 gap-px rounded-control border border-hairline bg-hairline overflow-hidden">
        <button
          onClick={() => setExpertMode(!expertMode)}
          className="group cursor-pointer bg-well px-2.5 py-2 text-left transition-colors hover:bg-panel md:px-3 md:py-2.5"
        >
          <p className="hud-label mb-1">Mode</p>
          <p className="flex items-center gap-1.5 text-xs font-medium md:text-sm">
            <span
              className={`h-1.5 w-1.5 rounded-full ${channelDot} animate-pulse-glow`}
            />
            <span
              className={`${channel} group-hover:underline underline-offset-2`}
            >
              {expertMode ? "Expert" : "Normal"}
            </span>
          </p>
        </button>
        <button
          onClick={onOpenCountrySet}
          className="group cursor-pointer bg-well px-2.5 py-2 text-left transition-colors hover:bg-panel md:px-3 md:py-2.5"
        >
          <p className="hud-label mb-1">Country set</p>
          <p className="truncate text-xs font-medium text-mid underline-offset-2 group-hover:text-hi group-hover:underline md:text-sm">
            {countrySetName}
          </p>
        </button>
      </div>

      {/* Actions */}
      <div className="space-y-2 md:space-y-2.5">
        <button
          onClick={onStart}
          className={`btn-primary ${expertMode ? "btn-expert" : "btn-signal"}`}
        >
          {expertMode ? "Start expert game" : "Start game"}
        </button>

        <button onClick={onRace} className="btn-ghost group">
          <UsersIcon size={14} />
          <span>Live race</span>
        </button>

        <button onClick={onOpenSettings} className="btn-ghost group">
          <SlidersIcon size={14} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
