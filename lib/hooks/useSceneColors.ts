"use client";

import { SCENE_PALETTES, type ScenePalette } from "@/lib/constants";
import { useSettingsStore } from "@/lib/store/settings-store";

/**
 * The active Three.js scene palette.
 *
 * Scene components read colors through this rather than importing a constant,
 * so a theme change re-renders the materials. The palette objects are module
 * constants, so the returned reference is stable per theme and effects keyed
 * on it (texture repaints) fire exactly once per switch.
 */
export function useSceneColors(): ScenePalette {
  return SCENE_PALETTES[useSettingsStore((s) => s.theme)];
}
