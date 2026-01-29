"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/lib/store/game-store";
import { TIMER_CONFIG } from "@/lib/constants";
import { formatCountdown } from "@/lib/utils";

export default function CountdownTimer() {
  const phase = useGameStore((s) => s.phase);
  const countdownRemaining = useGameStore((s) => s.countdownRemaining);
  const countdownTimerLimit = useGameStore((s) => s.countdownTimerLimit);
  const setCountdownRemaining = useGameStore((s) => s.setCountdownRemaining);
  const handleTimerExpired = useGameStore((s) => s.handleTimerExpired);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Don't run if timer is disabled
    if (countdownTimerLimit === null) {
      return;
    }

    // Only run timer during playing phase
    if (phase !== "playing") {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start countdown interval
    intervalRef.current = setInterval(() => {
      const state = useGameStore.getState();

      // Don't decrement if paused (gamePausedAt is set)
      if (state.gamePausedAt !== null) {
        return;
      }

      const newTime = Math.max(0, state.countdownRemaining - TIMER_CONFIG.updateInterval / 1000);

      if (newTime <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        handleTimerExpired();
      } else {
        setCountdownRemaining(newTime);
      }
    }, TIMER_CONFIG.updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [phase, handleTimerExpired, setCountdownRemaining, countdownTimerLimit]);

  // Only render if timer is enabled
  if (countdownTimerLimit === null) {
    return null;
  }

  const percentage = countdownTimerLimit > 0 ? countdownRemaining / countdownTimerLimit : 0;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage);

  // Color based on percentage remaining
  let color = "#10b981"; // green
  if (percentage < TIMER_CONFIG.warningThreshold) {
    color = "#ef4444"; // red
  } else if (percentage < TIMER_CONFIG.criticalThreshold) {
    color = "#eab308"; // yellow
  }

  const shouldPulse = percentage < TIMER_CONFIG.warningThreshold;

  return (
    <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10">
      <div
        className={`relative ${shouldPulse ? "animate-timer-pulse" : ""}`}
        style={{ width: 80, height: 80 }}
      >
        <svg width="80" height="80" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
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
            className="text-xl font-bold tabular-nums"
            style={{ color }}
          >
            {formatCountdown(countdownRemaining)}
          </p>
        </div>
      </div>
    </div>
  );
}
