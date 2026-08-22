"use client";

import { useGameStore } from "@/lib/store/game-store";

interface MenuButtonProps {
  onClick: () => void;
}

export default function MenuButton({ onClick }: MenuButtonProps) {
  const phase = useGameStore((s) => s.phase);

  if (phase !== "playing" && phase !== "feedback" && phase !== "mustclick") return null;

  return (
    <button
      onClick={onClick}
      aria-label="Menu"
      className="hud-card hud-top press group absolute left-4 z-10 cursor-pointer transition-all md:left-6"
    >
      <div className="hud-card-row flex-col justify-center gap-[5px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-px w-5 bg-mid transition-colors group-hover:bg-hi"
          />
        ))}
      </div>
    </button>
  );
}
