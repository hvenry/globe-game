/**
 * Where the race server lives. Defaults to the local Worker so `pnpm race:dev`
 * plus `pnpm dev` works with no environment set up.
 */
export const RACE_SERVER_URL =
  process.env.NEXT_PUBLIC_RACE_SERVER_URL ?? "http://localhost:8787";

export const raceSocketUrl = (roomId: string): string =>
  `${RACE_SERVER_URL.replace(/^http/, "ws")}/api/rooms/${roomId}/ws`;
