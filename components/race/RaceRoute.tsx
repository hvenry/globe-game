"use client";

import { useSearchParams } from "next/navigation";
import GameContainer from "@/components/game/GameContainer";
import { normalizeRoomCode } from "@/lib/race/room-code";

/**
 * `/race?room=CODE` is the invite link. It renders the same container as the
 * home page, already switched into race mode, so an invite lands straight on
 * the join form with the code filled in.
 */
export default function RaceRoute() {
  const room = useSearchParams().get("room") ?? "";
  return (
    <GameContainer initialMode="race" initialRoom={normalizeRoomCode(room)} />
  );
}
