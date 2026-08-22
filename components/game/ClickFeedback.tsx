"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/lib/store/game-store";
import { useLabelProjectionStore } from "@/lib/store/label-projection-store";

const LABEL_DURATION = 2000;

export default function ClickFeedback() {
  const floatingLabels = useGameStore((s) => s.floatingLabels);
  const removeFloatingLabel = useGameStore((s) => s.removeFloatingLabel);
  const projectedLabels = useLabelProjectionStore((s) => s.labels);
  const [currentTime, setCurrentTime] = useState(0);

  const hasLabels = floatingLabels.length > 0;

  // Remove labels after duration
  useEffect(() => {
    if (!hasLabels) return;
    const timers = floatingLabels.map((label) => {
      return setTimeout(() => {
        removeFloatingLabel(label.id);
      }, LABEL_DURATION);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [hasLabels, floatingLabels, removeFloatingLabel]);

  // Drive fade-out animation only while labels are on screen
  useEffect(() => {
    if (!hasLabels) return;
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 50);
    return () => clearInterval(interval);
  }, [hasLabels]);

  if (!hasLabels) return null;

  const activeIds = new Set(floatingLabels.map((label) => label.id));

  return (
    <div className="pointer-events-none fixed inset-0">
      {projectedLabels.map((label) => {
        if (!label.visible || !activeIds.has(label.id)) return null;

        // Before the first tick, currentTime predates the label: age clamps
        // to 0 and the label renders fully opaque
        const age = Math.max(0, currentTime - label.createdAt);
        const progress = Math.min(1, age / LABEL_DURATION);
        const opacity = Math.max(0, 1 - progress);

        return (
          <div
            key={label.id}
            className="hud-glass absolute whitespace-nowrap px-1.5 py-0.5 text-sm font-medium"
            style={{
              left: `${label.screenX}px`,
              top: `${label.screenY}px`,
              opacity,
              transform: `translate(-50%, -50%)`,
              transition: "opacity 0.3s ease-out",
              color: "var(--hud-ink)",
              textShadow: "0 2px 8px var(--hud-ink-shadow)",
            }}
          >
            {label.name}
          </div>
        );
      })}
    </div>
  );
}
