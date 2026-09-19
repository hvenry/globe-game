"use client";

import { useState } from "react";
import { ROOM_CODE_LENGTH, normalizeRoomCode } from "@/lib/race/room-code";

/**
 * Six-cell room code entry. One real, invisible input sits over the cells so
 * typing, paste (including a whole invite link), autofill and mobile
 * keyboards all behave like a normal field; the cells are only the display.
 */
export default function CodeInput({
  id,
  value,
  onChange,
  onSubmit,
}: {
  id: string;
  value: string;
  onChange: (code: string) => void;
  onSubmit?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const cells = Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => value[i] ?? "");
  const active = Math.min(value.length, ROOM_CODE_LENGTH - 1);

  return (
    <div className="relative">
      <div className="grid grid-cols-6 gap-1.5" aria-hidden="true">
        {cells.map((char, i) => {
          const isCaret = focused && i === active && value.length < ROOM_CODE_LENGTH;
          return (
            <div
              key={i}
              className={`readout flex aspect-square items-center justify-center rounded-control border text-lg text-hi transition-colors ${
                isCaret
                  ? "border-signal bg-signal-soft"
                  : char
                    ? "border-hairline-strong bg-well"
                    : "border-hairline bg-well"
              }`}
            >
              {char}
            </div>
          );
        })}
      </div>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(normalizeRoomCode(e.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit?.();
        }}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        aria-label="Room code"
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
    </div>
  );
}
