"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/lib/store/game-store";
import { TIMER_CONFIG } from "@/lib/constants";
import { formatCountdown } from "@/lib/utils";

/**
 * Countdown dial driven by the engine's wall-clock deadline: remaining time
 * is always computed from `timerDeadline - now`, so ticks can be throttled
 * (background tabs) or missed entirely without the countdown drifting.
 */
export default function CountdownTimer() {
  const phase = useGameStore((s) => s.phase);
  const timerDeadline = useGameStore((s) => s.timerDeadline);
  const gamePausedAt = useGameStore((s) => s.gamePausedAt);
  const countdownTimerLimit = useGameStore((s) => s.countdownTimerLimit);
  const handleTimerExpired = useGameStore((s) => s.handleTimerExpired);

  const [remainingSec, setRemainingSec] = useState<number | null>(null);

  useEffect(() => {
    // No active deadline (feedback / mustclick): freeze the last shown value
    if (timerDeadline === null) return;

    const update = () => {
      // While paused the clock freezes at the pause moment
      const effectiveNow = gamePausedAt ?? Date.now();
      const remaining = Math.max(0, timerDeadline - effectiveNow) / 1000;
      setRemainingSec(remaining);
      if (remaining <= 0 && gamePausedAt === null) {
        handleTimerExpired();
      }
    };

    update();
    const interval = setInterval(update, TIMER_CONFIG.updateInterval);
    return () => clearInterval(interval);
  }, [timerDeadline, gamePausedAt, handleTimerExpired]);

  // Only render while an active question has a running countdown
  if (
    countdownTimerLimit === null ||
    remainingSec === null ||
    (phase !== "playing" && phase !== "feedback" && phase !== "mustclick")
  ) {
    return null;
  }

  const percentage = countdownTimerLimit > 0 ? remainingSec / countdownTimerLimit : 0;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage);

  // Color based on percentage remaining. Reads the DOM token layer rather
  // than the scene palette: this is an SVG element, so it themes with the
  // rest of the chrome and stays identical between server and client render.
  let color = "rgb(var(--signal))";
  if (percentage < TIMER_CONFIG.warningThreshold) {
    color = "rgb(var(--alert))";
  } else if (percentage < TIMER_CONFIG.criticalThreshold) {
    color = "rgb(var(--caution))";
  }

  const shouldPulse = percentage < TIMER_CONFIG.warningThreshold;

  return (
    <div className="absolute left-4 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-10 md:bottom-auto md:left-6 md:top-1/2 md:-translate-y-1/2">
      <div
        className={`hud-glass relative origin-bottom-left scale-[0.72] rounded-full md:origin-center md:scale-100 ${
          shouldPulse ? "animate-timer-pulse" : ""
        }`}
        style={{ width: 80, height: 80 }}
      >
        <svg width="80" height="80" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="rgb(var(--line) / var(--line-strong-alpha))"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.3s ease" }}
          />
        </svg>
        {/* Time display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <p
            className="readout text-xl font-medium"
            style={{ color }}
          >
            {formatCountdown(remainingSec)}
          </p>
        </div>
      </div>
    </div>
  );
}
