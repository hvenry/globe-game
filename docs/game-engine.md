# Game Engine

The pure rules module that decides every solo outcome, written to run unchanged in the browser and on the race server.

## Why

Rules mixed into React or the stores can't run on a server, can't be replayed from a seed, and are hard to test.
Keeping them pure means the stores stay thin adapters, the race server reuses the same code, and every rule is covered by plain vitest.

## How it works

- Every rule is a transition: `(state, input, now) -> state`.
  The input is never mutated.
  A no-op returns the **same reference**, so callers detect "nothing happened" with `===`.
- `createSoloGame(countryIds, config, seed, now)` shuffles the set with the seed and fixes `order` for the whole run.
- Solo phases: `playing -> feedback | mustclick | gameover`.
  - Correct click: resolves `perfect` (no misses) or `almost`, then `feedback`.
  - Wrong click: costs a try; repeated wrong ids and already-resolved countries are free clicks.
  - Out of tries or timer expired (non-expert): resolves `failed` immediately, then `mustclick`, where only clicking the country moves on.
  - Expert mode: any miss or expiry goes straight to `gameover`.
  - `advance` leaves `feedback`/`mustclick`; with nothing unanswered it ends the game.
- `skip` moves through `unanswered` and stashes the country's tries, wrong guesses and time left in `saved`, restored on return.
- Timers are wall-clock deadlines (`timerDeadline`, epoch ms), never tick counts.
  `pause` records `pausedAt`; `resume` shifts the deadline by the paused span and adds it to `totalPausedMs`.
  `expireTimer` is a no-op until `now >= timerDeadline`, so callers can fire it freely.
- Scoring: a resolved country earns `triesRemaining / maxTries` (1.0 first try, 0 on `failed`).
- `questionsAnswered` counts a country the moment it resolves, so it already includes the active country during `feedback` and `mustclick`.
- The store adds an `idle` phase in front; the engine itself starts in `playing`.

## Tech

- TypeScript only, no runtime dependencies.
- mulberry32 PRNG for the seeded shuffle.
- Vitest for the rule suites.

## Key files

- `lib/engine/solo.ts` - solo transitions: `createSoloGame`, `guess`, `skip`, `advance`, `expireTimer`, `pause`, `resume`, `forfeit`, plus `timeRemainingMs` and `elapsedMs`.
- `lib/engine/types.ts` - `SoloState`, `SoloConfig`, `Resolution`, and the race types.
- `lib/engine/rng.ts` - `createRng`, `seededShuffle`, `randomSeed`.
- `lib/engine/solo.test.ts` - solo rule coverage.
- `lib/engine/race.ts` - race rules, see [Race mode](race-mode.md).

## Decisions and gotchas

- No `Map`, `Set`, `Date`, browser APIs, React or store imports: state must be JSON-serializable and the module must bundle into the Cloudflare Worker.
- `now` is always a parameter, so tests and the server control time.
- Engine modules use relative imports, not the `@/` alias, because the Worker bundles them directly.
- Same seed and same set always produce the same order; replays and shared games rely on it.
- Every new rule needs vitest coverage in the matching `*.test.ts`.

## Related

- [Race mode](race-mode.md)
- [State stores](state-stores.md)
- [Country data](country-data.md)
