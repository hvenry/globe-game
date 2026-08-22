/**
 * Deterministic RNG utilities.
 *
 * Games are shuffled with a seed so that two clients (or a server and its
 * clients) can independently derive the identical country order — the basis
 * of the multiplayer race mode, replays, and shareable challenges.
 */

/** mulberry32 — small, fast, deterministic PRNG returning floats in [0, 1). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle driven by a seeded RNG. Returns a new array. */
export function seededShuffle<T>(array: readonly T[], seed: number): T[] {
  const rng = createRng(seed);
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Non-deterministic seed for local games (server supplies seeds in races). */
export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}
