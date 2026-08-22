"use client";

import { useEffect, useState } from "react";
import { GLOBE_CONFIG } from "@/lib/constants";

const NARROW = "(max-width: 640px)";

/**
 * Camera framing for the hero view, widened on narrow viewports.
 *
 * The perspective FOV is vertical, so on a phone in portrait the globe fills
 * the width long before it fills the height — at the desktop distance it ends
 * up cropped and mostly hidden behind the menu panel. Pulling the camera back
 * restores roughly the desktop globe-to-viewport ratio.
 *
 * `maxDistance` has to move with it, or OrbitControls clamps the hero flight
 * straight back to the desktop framing.
 */
export function useHeroFraming(): { heroDistance: number; maxDistance: number } {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia(NARROW).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return narrow
    ? {
        heroDistance: GLOBE_CONFIG.narrow.cameraZ,
        maxDistance: GLOBE_CONFIG.narrow.maxDistance,
      }
    : {
        heroDistance: GLOBE_CONFIG.cameraZ,
        maxDistance: GLOBE_CONFIG.maxDistance,
      };
}
