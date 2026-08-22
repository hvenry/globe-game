"use client";

import { useEffect } from "react";

/**
 * Blocks browser pinch- and double-tap-zoom while a full-screen panel is open.
 *
 * `viewport.userScalable = false` in app/layout.tsx covers most browsers, but
 * iOS Safari has ignored it since iOS 10, so the gesture has to be cancelled
 * directly: `gesture*` are Safari's proprietary pinch events, and the
 * multi-touch `touchmove` guard catches the browsers that don't fire them.
 *
 * Deliberately scoped to whichever panel calls it rather than installed
 * globally — the globe's own pinch-to-zoom is a core control during play, and
 * a document-level lock would kill it. Single-touch moves pass through
 * untouched, so scrolling inside the panel still works.
 */
export function usePinchZoomLock(active = true) {
  useEffect(() => {
    if (!active) return;

    const prevent = (e: Event) => e.preventDefault();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };

    document.addEventListener("gesturestart", prevent);
    document.addEventListener("gesturechange", prevent);
    document.addEventListener("gestureend", prevent);
    // Must be non-passive, or preventDefault is ignored
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", prevent);
      document.removeEventListener("gesturechange", prevent);
      document.removeEventListener("gestureend", prevent);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, [active]);
}
