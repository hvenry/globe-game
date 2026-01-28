"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/lib/store/game-store";
import type { FloatingLabel } from "@/lib/store/game-store";

const LABEL_DURATION = 2000;

interface ProjectedLabel extends FloatingLabel {
  screenX: number;
  screenY: number;
  visible: boolean;
}

export default function ClickFeedback() {
  const floatingLabels = useGameStore((s) => s.floatingLabels);
  const removeFloatingLabel = useGameStore((s) => s.removeFloatingLabel);
  const [projectedLabels, setProjectedLabels] = useState<ProjectedLabel[]>([]);

  // Remove labels after duration
  useEffect(() => {
    const timers = floatingLabels.map((label) => {
      return setTimeout(() => {
        removeFloatingLabel(label.id);
      }, LABEL_DURATION);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [floatingLabels, removeFloatingLabel]);

  // Subscribe to projection updates from Globe
  useEffect(() => {
    const handleProjectionUpdate = ((e: CustomEvent) => {
      setProjectedLabels(e.detail);
    }) as EventListener;

    window.addEventListener("label-projection-update", handleProjectionUpdate);
    return () => {
      window.removeEventListener(
        "label-projection-update",
        handleProjectionUpdate
      );
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0">
      {projectedLabels.map((label) => {
        if (!label.visible) return null;

        const age = Date.now() - label.createdAt;
        const progress = Math.min(1, age / LABEL_DURATION);
        const opacity = Math.max(0, 1 - progress);

        return (
          <div
            key={label.id}
            className="absolute text-white text-sm font-medium whitespace-nowrap"
            style={{
              left: `${label.screenX}px`,
              top: `${label.screenY}px`,
              opacity,
              transform: `translate(-50%, -50%)`,
              transition: "opacity 0.3s ease-out",
              textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)",
            }}
          >
            {label.name}
          </div>
        );
      })}
    </div>
  );
}
