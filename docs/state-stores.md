# State Stores

The Zustand stores that connect the pure engine and persisted preferences to React components.

## Why

Components need cheap, granular subscriptions, and some state (settings, best scores) must survive reloads.
The stores supply that without owning any game rules, so the engine stays the single source of truth.

## How it works

- **Game store** holds the solo engine state and adapts it for the UI.
  - Each action calls `apply(transition)`, which runs an engine function with `Date.now()`.
  - A same-reference result is dropped; otherwise `mirror()` flattens the engine state into flat fields (`currentCountry`, `triesRemaining`, `timerDeadline`, ...).
  - It also owns UI-only state: floating labels (cleared when the question changes) and per-game lookups (`countriesById`, `validCountryIds`).
  - `resetGame` returns to `idle`, a phase the engine doesn't have.
- **Settings store** is persisted (`globe-game-settings`, version 4, with migrations per version).
  - `setExpertMode(true)` saves skips, hints, timer and tries into `preExpert*` fields, then locks 1 try, no hints, no skips and the expert timer.
    `setExpertMode(false)` restores them.
  - A custom `merge` forces the dark theme while the `lightMode` feature flag is off.
  - Also holds race identity (`playerColor`, `playerName`), sound and camera speeds.
- **Stats store** is persisted (`globe-game-stats`, version 2).
  - Records games, best scores per set (normal and expert), and the Daily 20 result per UTC date.
  - A custom `merge` deep-merges `bestScores` and `expertBestScores`, so sets added later read 0 instead of `undefined`.
- **Label projection store** carries floating-label screen positions from the scene to the DOM overlay.
  `LabelProjector` writes it in `useFrame`; `ClickFeedback` reads it.
- **Hydration**: persisted stores load from localStorage on the client only.
  UI that renders their values waits for `useHydrated()` to avoid SSR mismatches.

## Tech

- Zustand 5 with the `persist` middleware (localStorage).
- React `useSyncExternalStore` for the hydration gate.

## Key files

- `lib/store/game-store.ts` - solo adapter: `apply`, `mirror`, floating labels.
- `lib/store/settings-store.ts` - persisted preferences and the expert lock.
- `lib/store/stats-store.ts` - persisted records, Daily 20 results, deep merge.
- `lib/store/label-projection-store.ts` - scene-to-DOM label bridge.
- `lib/hooks/useHydrated.ts` - client-only render gate.
- `lib/store/race-store.ts` - race adapter, see [Race client](race-client.md).

## Decisions and gotchas

- Consume stores with per-field selectors (`useStore((s) => s.field)`), never whole-store destructuring, so components re-render only on their own fields.
- The flat mirror exists for selector granularity; read `engine` directly only when you need the full state.
- Expert rules live entirely in `setExpertMode`; don't re-enforce them in components.
- Changing a persisted shape means bumping `version` and adding a `migrate` step.
- The game store's `Set` (`validCountryIds`) is fine here; the no-`Set` rule applies only to engine state.

## Related

- [Game engine](game-engine.md)
- [Race client](race-client.md)
- [Globe rendering](globe-rendering.md)
