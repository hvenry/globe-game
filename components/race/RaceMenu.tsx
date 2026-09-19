"use client";

/**
 * The mid-race menu.
 *
 * A race has no pause: the server owns the clock, so country windows keep
 * expiring while this is open, and the veil over the globe means you cannot
 * claim one meanwhile. That cost is the reason the panel says so out loud,
 * and the reason leaving asks twice.
 *
 * Laid out like the solo pause menu, on purpose: settings live behind the
 * icon in the corner and swap the card for the same `ControlsSection`. Which
 * view is showing is the caller's state, so Escape can step back one rung.
 */

import { standings as rank } from "@/lib/engine/race";
import { useRaceStore, playerPalette } from "@/lib/store/race-store";
import ControlsSection from "@/components/game/settings/ControlsSection";
import { ChevronLeftIcon, SlidersIcon } from "@/components/ui/icons";
import { usePinchZoomLock } from "@/lib/hooks/usePinchZoomLock";

/** Null closes the menu; the rest are its rungs. */
export type RaceMenuView = "menu" | "controls" | "confirm-leave" | "confirm-quit";

export default function RaceMenu({
  view,
  onView,
  onConfirmExit,
}: {
  view: RaceMenuView;
  onView: (view: RaceMenuView | null) => void;
  onConfirmExit: () => void;
}) {
  // A menu, not the globe: pinching it should do nothing rather than zoom
  // the scene behind it.
  usePinchZoomLock();

  const race = useRaceStore((s) => s.race);
  const playerId = useRaceStore((s) => s.playerId);

  if (!race) return null;

  const resolved = Object.keys(race.results).length;
  const total = race.order.length;
  const progress = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return (
    <div className="veil absolute inset-0 z-40 flex items-center justify-center p-4">
      {/* `.scrollbar-hide` only covers WebKit; Firefox needs the property. */}
      <div
        className="panel panel-ticks panel-dialog max-h-[85vh] overflow-y-auto scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {view === "controls" ? (
          <div className="text-left">
            <div className="flex items-center justify-between">
              <button
                onClick={() => onView("menu")}
                aria-label="Back"
                className="btn-icon press"
              >
                <ChevronLeftIcon size={13} />
              </button>
              <h2 className="hud-label text-mid">Controls</h2>
              {/* Balances the back button so the title stays centred. */}
              <div className="h-7 w-7" />
            </div>

            <div className="mt-6">
              <ControlsSection expertMode={false} />
            </div>

            <p className="mt-6 text-center text-label text-faint">
              The race keeps running while you are in here
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={() => onView("controls")}
              aria-label="Controls"
              className="btn-icon press absolute right-3 top-3 md:right-4 md:top-4"
            >
              <SlidersIcon size={13} />
            </button>

            <div className="text-center">
              <p className="hud-label text-signal">Race menu</p>
              <p className="mt-1 text-label text-faint">The clock keeps running</p>
            </div>

            <div className="mt-5 space-y-2 text-center">
              <p className="readout text-xl font-medium text-hi md:text-2xl">
                {resolved}
                <span className="mx-1 text-faint">/</span>
                {total}
              </p>
              <div className="progress-track">
                <div
                  className="h-1 rounded-full bg-signal transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <ul className="mt-5 flex flex-col gap-2">
              {rank(race).map((p, i) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between border border-hairline px-3 py-2"
                >
                  <span className="flex items-center gap-3">
                    <span className="readout text-faint">{i + 1}</span>
                    <span
                      className={`flex items-center gap-2 ${
                        p.id === playerId ? "text-hi" : "text-mid"
                      }`}
                    >
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: playerPalette(p.color).claim }}
                      />
                      {p.name}
                      {!p.connected && <span className="hud-label ml-2 text-faint">gone</span>}
                    </span>
                  </span>
                  <span className="readout text-hi">{p.claims}</span>
                </li>
              ))}
            </ul>

            {view === "menu" ? (
              <div className="mt-7 space-y-2 md:space-y-2.5">
                <button
                  onClick={() => onView(null)}
                  className="btn-primary btn-signal press hover:brightness-110 hover:shadow-[0_0_24px_rgb(var(--signal)/0.4)]"
                >
                  Resume
                </button>
                <button onClick={() => onView("confirm-leave")} className="btn-ghost press">
                  Leave race
                </button>
                <button onClick={() => onView("confirm-quit")} className="btn-quiet press">
                  Quit to menu
                </button>
              </div>
            ) : (
              /* Staying is the safe answer, so it keeps the emphasis and
                 leaving takes the quiet treatment solo gives "Quit game". */
              <div className="mt-7 space-y-2 md:space-y-2.5">
                <p className="text-center text-sm text-hi">Leave the race in progress?</p>
                <p className="text-center text-label text-faint">
                  Your claims stand, and the room code gets you back in.
                </p>
                <button
                  onClick={() => onView("menu")}
                  className="btn-primary btn-signal press mt-1 hover:brightness-110 hover:shadow-[0_0_24px_rgb(var(--signal)/0.4)]"
                >
                  Keep racing
                </button>
                <button onClick={onConfirmExit} className="btn-quiet press">
                  {view === "confirm-quit" ? "Yes, quit to menu" : "Yes, leave the race"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
