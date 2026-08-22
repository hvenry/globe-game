"use client";

import Image from "next/image";
import { useGameStore } from "@/lib/store/game-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { getFlagPath } from "@/lib/geo/iso-codes";
import { countryNameTier } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

export default function CountryPrompt() {
  const phase = useGameStore((s) => s.phase);
  const currentCountry = useGameStore((s) => s.currentCountry);
  const currentPosition = useGameStore((s) => s.currentPosition);
  const totalCountries = useGameStore((s) => s.totalCountries);
  const unansweredCount = useGameStore((s) => s.unansweredCount);
  const goNext = useGameStore((s) => s.goNext);
  const goPrev = useGameStore((s) => s.goPrev);
  const allowSkips = useSettingsStore((s) => s.allowSkips);

  if ((phase !== "playing" && phase !== "feedback" && phase !== "mustclick") || !currentCountry)
    return null;

  // The arrows keep their boxes whenever skipping is available and go inert
  // between questions; unmounting them made the card jump sideways.
  const skipsAvailable = allowSkips && unansweredCount > 1;
  const canSkip = skipsAvailable && phase === "playing";
  const arrowBox = (enabled: boolean) =>
    `hud-glass press flex items-center px-2 transition-all duration-200 ${
      enabled
        ? "cursor-pointer text-mid hover:text-hi"
        : "cursor-default text-faint/50"
    }`;
  const nameSize = {
    short: "text-sm sm:text-lg md:text-2xl",
    medium: "text-sm sm:text-base md:text-xl",
    long: "text-xs sm:text-sm md:text-lg",
  }[countryNameTier(currentCountry.name)];
  const flagPath = getFlagPath(currentCountry.id);
  const pad = String(totalCountries).length;

  return (
    <>
      {/* The horizontal padding reserves room for the menu button and score
          readout, so a long name wraps inside the viewport rather than running
          under them. */}
      <div className="hud-top absolute left-1/2 z-10 w-screen -translate-x-1/2 px-[5.25rem] md:w-auto md:px-0">
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-stretch justify-center gap-1.5 md:gap-2">
            {skipsAvailable && (
              <button
                onClick={goPrev}
                disabled={!canSkip}
                className={arrowBox(canSkip)}
                aria-label="Previous country"
              >
                <ChevronLeftIcon size={14} />
              </button>
            )}

            <div
              key={currentCountry.id}
              className="hud-card hud-card-row animate-fade-in-up min-w-0 gap-2.5"
            >
              <Image
                src={flagPath}
                alt={`${currentCountry.name} flag`}
                width={40}
                height={28}
                className="h-3.5 w-5 shrink-0 rounded-xs border border-hairline object-cover md:h-5 md:w-7"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <p className={`min-w-0 text-balance font-semibold leading-tight text-hi ${nameSize}`}>
                {currentCountry.name}
              </p>
            </div>

            {skipsAvailable && (
              <button
                onClick={goNext}
                disabled={!canSkip}
                className={arrowBox(canSkip)}
                aria-label="Next country"
              >
                <ChevronRightIcon size={14} />
              </button>
            )}
          </div>

          <p className="hud-pill readout text-faint">
            {String(currentPosition).padStart(pad, "0")} / {totalCountries}
          </p>
        </div>
      </div>

      {phase === "mustclick" && (
        <div className="absolute bottom-[max(4.5rem,calc(env(safe-area-inset-bottom)+3.25rem))] left-1/2 z-10 -translate-x-1/2 md:bottom-[4.5rem]">
          <p className="hud-pill hud-label animate-fade-in-up whitespace-nowrap px-2.5 py-1 text-alert">
            Click the country to continue
          </p>
        </div>
      )}
    </>
  );
}
