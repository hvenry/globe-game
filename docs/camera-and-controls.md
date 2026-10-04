# Camera and Controls

How the camera moves: scripted flights between game phases, and OrbitControls tuned per zoom level and input type.

## Why

The camera has to frame each run's playfield without eating into the timer, show the player what they missed, and still feel precise when dragging at any zoom level, on mouse or touch.

## How it works

**Flights** (`useCameraAnimation`):

| Trigger | Flight | Cancellable |
|---|---|---|
| New run (`gameKey` changes) | To the set's center (`SET_CENTERS`), or hero framing if it has none | No |
| Game over, back to menu | Hero framing: equator level, standard distance, current azimuth | Yes |
| Expert loss | To the missed country at `revealDistance` | No |

- A flight tweens azimuth, polar angle and radius together in OrbitControls' own spherical parametrization, so the path never swings over a pole.
- Duration is proportional to the arc length (`cameraFlightSpeed`), clamped between `cameraFlightMinDuration` and `cameraFlightMaxDuration`, with ease-in-out.
- Frame delta is clamped so a background-tab hiccup cannot teleport the camera.
- OrbitControls is disabled during a flight; the hook keeps the camera aimed at the origin itself.
- Pointer-down or wheel (capture phase) cancels hero flights only.

**Intro holds the clock.**
The intro flight signals `onIntroArrived` when it settles.
`GameContainer` keeps the engine paused and input held until then, so fly-in time never counts against the timer.
A failsafe timeout releases the clock if the signal goes missing.
The expert-loss reveal signals `onRevealArrived` before results appear.

**Rotate speed.**
Rotate speed scales with distance to the globe surface, `(dist - radius) / (maxDistance - radius)`, floored at `rotateSpeedMinFactor`.
The visible ground patch shrinks with that distance, so this keeps the ground tracking the pointer about 1:1 at every zoom.

**Framing.**
`useHeroFraming` pulls the camera back on narrow viewports (`GLOBE_CONFIG.narrow`), because the vertical FOV crops the globe on a portrait phone.
`maxDistance` moves with it, or OrbitControls would clamp the hero flight back to desktop framing.

**Touch.**
`useIsCoarsePointer` (`pointer: coarse`) switches to `GLOBE_CONFIG.touch`: a closer zoom floor for micro-states, stronger damping, slower rotate and pinch, a looser drag threshold, and wider micro-state tap radii.
Per-event `pointerType` still decides hover and tap handling, so touch laptops keep mouse behavior.

**Pinch lock.**
`usePinchZoomLock` blocks browser pinch and double-tap zoom while a full-screen panel is open (iOS Safari ignores `userScalable: false`).
It is scoped to the calling panel, because a global lock would kill the globe's own pinch zoom.

## Tech

- drei `OrbitControls` (three-stdlib), `THREE.Spherical`.
- `matchMedia` via `useSyncExternalStore` and effects.

## Key files

- `components/globe/hooks/useCameraAnimation.ts` - phase-driven flights and cancellation
- `components/globe/Globe.tsx` - OrbitControls setup and per-frame rotate-speed scaling
- `components/game/GameContainer.tsx` - holds the clock until `onIntroArrived`
- `lib/hooks/useHeroFraming.ts` - hero distance and `maxDistance` per viewport
- `lib/hooks/useIsCoarsePointer.ts` - touch detection
- `lib/hooks/usePinchZoomLock.ts` - panel-scoped pinch lock
- `lib/geo/coords.ts` - `lngLatToCameraPos` for flight targets
- `lib/constants.ts` - `GLOBE_CONFIG` (distances, flight pacing, damping, touch, narrow)

## Decisions and gotchas

- The intro and the reveal are uninterruptible on purpose: the intro gates the clock, and the reveal is the player's one look at the missed country.
- Flights are keyed on the run's identity (`gameKey`), so a restart replays the intro and `onIntroArrived` always fires.
- If the camera is already framed, the intro releases the clock immediately rather than flying.
- Draw sets and "all" have no center and fly to hero framing.

## Related

- [Globe rendering](globe-rendering.md)
- [Game engine](game-engine.md)
- [State stores](state-stores.md)
