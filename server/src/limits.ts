/**
 * Operational limits, kept out of the game rules on purpose.
 *
 * Nothing here changes how a race plays. These exist so that a room cannot
 * outlive its usefulness, and so one client cannot make the room do unbounded
 * work on its behalf.
 */
export const ROOM_LIMITS = {
  /** A finished race stays readable this long before the room is torn down. */
  finishedTtlMs: 5 * 60_000,
  /** A room nobody is connected to is disposable sooner. */
  idleTtlMs: 15 * 60_000,
  /** Largest client frame we will even parse. */
  maxFrameBytes: 2_048,
  /** Per-socket token bucket: burst allowance, then a steady refill. */
  burst: 30,
  refillPerSecond: 10,
} as const;
