# Globe Expert

A geography game on a 3D globe: find each country by clicking it, at [globe.expert](https://globe.expert).
Play solo (timed runs, expert mode, regional sets) or race 2-4 players live at `/race`.
Rules are a pure engine shared by the browser and an authoritative race server.
Stack: TypeScript, Next.js, React Three Fiber (Three.js), Zustand, Tailwind, Cloudflare Workers + Durable Objects, Vercel, pnpm workspace, Vitest.

## Commands
```bash
pnpm dev                                      # app at http://localhost:3000
pnpm race:dev                                 # race server (wrangler dev) at http://localhost:8787
pnpm lint                                     # ESLint
pnpm type-check                               # tsc for the app and the race server
pnpm test                                     # vitest on lib/, then the race server's tests
pnpm exec vitest run lib/engine/race.test.ts  # single test file
pnpm exec vitest run lib -t "<test name>"     # tests matching a name
pnpm --filter @globe/race-server test         # race server tests only
pnpm build                                    # production build
scripts/build-audio.sh                        # audio-wip/ -> public/audio/ MP3s (needs ffmpeg; --all for the lab)
```

## Repo map
```
app/              routes: / (solo), /race, /sound (cue lab); globals.css design tokens
components/game/  GameContainer orchestrator, solo HUD, menus, game over
components/race/  join, lobby, race HUD, feed, results
components/globe/ R3F scene; behavior in hooks/
lib/engine/       pure solo + race rules, seeded RNG
lib/store/        Zustand adapters: game, race, settings, stats, label projection
lib/race/         socket client, protocol types, room codes, reconnect session
lib/geo/          country data, sets, seeded draws, coordinate math
lib/sound/        Web Audio cue engine
lib/constants.ts  every tunable (*_CONFIG, GLOBE_LAYER, SCENE_PALETTES, RACE_SCORING)
server/           race Worker, RaceRoom Durable Object, lobby rules
```

## Conventions
- **`lib/engine/` stays pure: no browser APIs, React, stores, or `Map`/`Set`/`Date`; `(state, input, now) -> state`, same reference for a no-op.** The race server runs the same code and keeps state in Durable Object storage; a no-op returning the input is how adapters detect "nothing happened".
- **Engine rules get vitest coverage.** The server trusts the engine to settle claims; an untested rule breaks races with no UI to catch it.
- **Timers are wall-clock deadlines (epoch ms), never tick counters.** Background tabs throttle frames, and the server sleeps until `nextTransitionAt`.
- **Server-bundled `lib/` modules use relative imports and no browser or Next APIs.** The Worker build has no `@/` alias and no DOM; see `docs/race-server.md` for the list.
- **Race clients only receive `publicView(state)`.** `order` and `seed` name every upcoming country.
- **Never paint or upload globe textures per frame.** A full base upload is 32 MB; animate with material tints instead.
- **New globe layers get a `GLOBE_LAYER` entry; scene colors come from `SCENE_PALETTES` via `useSceneColors()`.** Without the entry, a later-mounted transparent layer draws in front; hard-coded colors break the light theme.
- **All lng/lat <-> 3D conversion goes through `lib/geo/coords.ts`.** The globe's +X-axis convention is easy to get subtly wrong.
- **Engine and stores use base country ids (`baseId()`).** Multi-polygon features carry suffixed ids that would never match a prompt.
- **Read stores with per-field selectors; render persisted-store UI behind `useHydrated()`.** Whole-store reads re-render on every change; persisted values differ between SSR and client.
- **Style with the tokens in `app/globals.css`; numerals use `.readout`; import icons from `components/ui/icons.tsx`.** Ad hoc colors and direct Phosphor imports drift from the design system and the light theme.
- **Update the doc and its trigger here in the same change as the code.** Docs are the architecture reference; stale docs mislead the next agent.

## Docs
Gameplay:
- Before changing solo rules, scoring, timers or `lib/engine/`, read `docs/game-engine.md`.
- Before adding store fields, persisted settings or stats, read `docs/state-stores.md`.
- Before touching country ids, names, sets, draws, flags or coordinates, read `docs/country-data.md`.
- Before adding or changing a sound cue, the `/sound` lab or the audio build, read `docs/sound.md`.

Globe:
- Before changing globe layers, textures, fills or picking, read `docs/globe-rendering.md`.
- Before changing camera flights, OrbitControls tuning or touch handling, read `docs/camera-and-controls.md`.
- Before changing globe colors, opacities or lighting, read `docs/design-scene-palette.md`.

Race:
- Before changing race rules, phases or scoring, read `docs/race-mode.md`.
- Before changing the Worker, Durable Object, lobby or room limits, read `docs/race-server.md`.
- Before adding or changing a wire message or error code, read `docs/race-protocol.md`.
- Before changing the race store, socket, reconnect or `components/race/`, read `docs/race-client.md`.
- Before changing player colors or how claims render, read `docs/player-colors.md`.

UI:
- Before styling new UI or picking a color, read `docs/design-system.md`.
- Before adding or changing a CSS token or theme value, read `docs/design-tokens.md`.
- Before building a panel, dialog or button, read `docs/ui-components.md`.
- Before changing in-game readouts (cards, pills, timer, score), read `docs/ui-hud.md`.
- Before laying out a menu, dialog header or settings view, read `docs/ui-patterns.md`.
- Before adding or changing an animation, read `docs/ui-motion.md`.

Delivery:
- Before changing a GitHub workflow or the race server deploy filter, read `docs/ci-cd.md`.
- Before writing a PR title meant to bump a version, or touching release logic, read `docs/versioning.md`.
- Before configuring Vercel, Cloudflare, GitHub secrets or `ALLOWED_ORIGINS`, read `docs/deploy-setup.md`.
