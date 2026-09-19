"use client";

/** Offset between the three dots, so the brightening reads as a wave. */
const DOT_STAGGER_MS = 160;
const DOTS = [0, 1, 2];

export default function LoadingScreen() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ground">
      <div className="space-y-5 text-center">
        <div
          className="flex items-center justify-center gap-2"
          aria-hidden="true"
        >
          {DOTS.map((i) => (
            <span
              key={i}
              className="animate-loading-dot h-1.5 w-1.5 rounded-full bg-signal"
              style={{ animationDelay: `${i * DOT_STAGGER_MS}ms` }}
            />
          ))}
        </div>
        <p className="hud-label">Initializing globe</p>
      </div>
    </div>
  );
}
