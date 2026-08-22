import { create } from "zustand";
import type { FloatingLabel } from "@/lib/store/game-store";

export interface ProjectedLabel extends FloatingLabel {
  screenX: number;
  screenY: number;
  visible: boolean;
}

interface LabelProjectionState {
  labels: ProjectedLabel[];
  setLabels: (labels: ProjectedLabel[]) => void;
}

/**
 * Bridge between the Three.js scene (which projects floating labels to screen
 * space every frame) and the DOM overlay that renders them.
 */
export const useLabelProjectionStore = create<LabelProjectionState>((set) => ({
  labels: [],
  setLabels: (labels) => set({ labels }),
}));
