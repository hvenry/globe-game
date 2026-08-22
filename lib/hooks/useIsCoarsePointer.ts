"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(pointer: coarse)";

function subscribe(callback: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

/**
 * True when the primary pointer is coarse (touch screens). Used to tune the
 * globe for mobile: no hover, grippier controls, deeper zoom, fatter tap
 * targets. Per-event `pointerType` still decides for individual events, so
 * touch-capable laptops keep their mouse behavior.
 */
export function useIsCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
