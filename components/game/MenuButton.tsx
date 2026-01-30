"use client";

import { useGameStore } from "@/lib/store/game-store";

interface MenuButtonProps {
  onClick: () => void;
}

export default function MenuButton({ onClick }: MenuButtonProps) {
  const phase = useGameStore((s) => s.phase);

  if (phase !== "playing" && phase !== "feedback") return null;

  return (
    <button
      onClick={onClick}
      className="absolute top-6 left-6 z-10 group cursor-pointer transition-all duration-200 hover:scale-105"
    >
      <div className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg backdrop-blur-md border bg-black/30 border-white/10 hover:bg-black/50 hover:border-white/20 transition-colors">
        {/* Hamburger icon */}
        <div className="flex flex-col gap-1">
          <div className="w-5 h-0.5 rounded-full bg-white transition-colors" />
          <div className="w-5 h-0.5 rounded-full bg-white transition-colors" />
          <div className="w-5 h-0.5 rounded-full bg-white transition-colors" />
        </div>
        {/* Keybind text */}
        <p className="text-[9px] tracking-wider text-white/50 transition-colors">
          ESC
        </p>
      </div>
    </button>
  );
}
