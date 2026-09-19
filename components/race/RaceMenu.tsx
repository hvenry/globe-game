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
import { useRaceStore } from "@/lib/store/race-store";
import ControlsSection from "@/components/game/settings/ControlsSection";
import { SlidersIcon } from "@/components/ui/icons";
import PanelHeader from "@/components/ui/PanelHeader";
import { usePinchZoomLock } from "@/lib/hooks/usePinchZoomLock";
import PlayerDot from "./PlayerDot";

/** Null closes the menu; the rest are its rungs. */
export type RaceMenuView =
  | "menu"
  | "controls"
  | "confirm-leave"
  | "confirm-quit"
  | "confirm-end";

/**
 * Both confirmations read the same way: what is about to happen, what it
 * costs, and staying keeping the emphasis — leaving takes the quiet treatment
 * solo gives "Quit game".
 */
function Confirm({
  question,
  consequence,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  question: string;
  consequence: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-7 space-y-2 md:space-y-2.5">
      <p className="text-center text-sm text-hi">{question}</p>
      <p className="text-center text-label text-faint">{consequence}</p>
      <button onClick={onCancel} className="btn-primary btn-signal press mt-1">
        Keep racing
      </button>
      <button onClick={onConfirm} className="btn-quiet press">
        {confirmLabel}
      </button>
    </div>
  );
}

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
  const hostId = useRaceStore((s) => s.lobby?.hostId);
  const endRace = useRaceStore((s) => s.end);
  const isHost = hostId === playerId;

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
            <PanelHeader title="Controls" onBack={() => onView("menu")} />

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
              data-sound="open"
              className="btn-icon press absolute right-3 top-3 md:right-4 md:top-4"
            >
              <SlidersIcon size={13} />
            </button>

            <div className="text-center">
              <p className="hud-label text-signal">Race menu</p>
              <p className="mt-1 text-label text-faint">
                The clock keeps running
              </p>
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
                      <PlayerDot color={p.color} />
                      {p.name}
                      {!p.connected && (
                        <span className="hud-label ml-2 text-faint">gone</span>
                      )}
                    </span>
                  </span>
                  <span className="readout text-signal">
                    {p.score.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>

            {view === "menu" && (
              <div className="mt-7 space-y-2 md:space-y-2.5">
                <button
                  onClick={() => onView(null)}
                  className="btn-primary btn-signal press"
                >
                  Resume
                </button>
                <button
                  onClick={() => onView("confirm-leave")}
                  className="btn-ghost press"
                >
                  Leave race
                </button>
                {isHost && (
                  <button
                    onClick={() => onView("confirm-end")}
                    className="btn-danger press"
                  >
                    End race for everyone
                  </button>
                )}
                <button
                  onClick={() => onView("confirm-quit")}
                  className="btn-quiet press"
                >
                  Quit to menu
                </button>
              </div>
            )}

            {view === "confirm-end" && (
              <Confirm
                question="End the race for everyone?"
                consequence="Standings are whatever has been played so far."
                confirmLabel="Yes, end the race"
                onCancel={() => onView("menu")}
                onConfirm={() => {
                  onView(null);
                  endRace();
                }}
              />
            )}

            {(view === "confirm-leave" || view === "confirm-quit") && (
              <Confirm
                question="Leave the race in progress?"
                consequence="Your claims stand, and the room code gets you back in."
                confirmLabel={
                  view === "confirm-quit"
                    ? "Yes, quit to menu"
                    : "Yes, leave the race"
                }
                onCancel={() => onView("menu")}
                onConfirm={onConfirmExit}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
