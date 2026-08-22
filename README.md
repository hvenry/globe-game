# globe.expert

A geography game on an interactive 3D globe. Identify countries by clicking on them as they appear — timed runs, expert mode, and per-continent challenges.

Live at [globe.expert](https://globe.expert)

![globe.expert](public/og.png)

## Overview

Globe Expert challenges players to locate all 195 UN-recognized sovereign states on a 3D globe. It features multiple difficulty modes, per-country countdown timers, persistent statistics, and a mobile-tuned control scheme.

**Note:** Tuvalu is rendered as a synthetic marker since it's not present in the Natural Earth 50m dataset.

## Tech Stack

- **Framework:** Next.js 16 (React 19)
- **Language:** TypeScript
- **Tooling:** pnpm for packages, Vitest for tests
- **3D Rendering:** Three.js via React Three Fiber + Drei
- **State:** Zustand (thin adapters over a pure game engine)
- **Styling:** Tailwind CSS 4 with a custom design-token system
- **Typography:** Space Grotesk (display) + Geist Mono (readouts)
- **Geo Data:** TopoJSON (Natural Earth 50m)
- **Hosting:** Vercel

## Architecture

### The game engine (`lib/engine/`)

Game rules live in a **pure, deterministic, serializable engine** — no React, no browser APIs, no `Map`/`Set`/`Date`. Every rule is a transition function:

```ts
guess(state, countryId, now) → state
expireTimer(state, now) → state
skip(state, direction, now) → state
```

Key properties:

- **Seeded shuffle** (mulberry32): a game is fully reproducible from its seed — the basis for the planned multiplayer race mode, where a server and both clients derive the identical country order from one seed.
- **Wall-clock deadlines**: timers are absolute timestamps, never tick counters — immune to background-tab throttling and frame drops.
- **Reference-equality no-ops**: invalid actions return the input state unchanged, so adapters detect "nothing happened" for free.
- **Tested**: the full ruleset is covered by `pnpm test` (`lib/engine/solo.test.ts`).

The Zustand game store (`lib/store/game-store.ts`) is a thin adapter: it holds the engine state, mirrors it into flat fields for component selectors, and owns UI-only concerns (floating labels, country metadata). Settings and stats stores persist to localStorage with versioned migrations.

Game phases: `idle → playing → feedback → gameover`, plus `mustclick` (non-expert): when tries or time run out, the country resolves as failed and the player must click it before moving on — the game teaches as it plays.

### Globe rendering (`components/globe/`)

A layered Three.js scene: base sphere → grid → atmosphere → two country-fill texture layers → border outlines → micro-state markers → radar pulse → invisible event-catcher sphere. Behavior lives in hooks:

- **`useCountryTextures`** — country fills are 2D canvases projected onto the sphere, split into a *base* layer (resolved/wrong fills, repaints only on state change) and a *dynamic* layer (hover + mustclick pulse, painted imperatively per frame with no React involvement).
- **`useCountryPicking`** — pointer → country lookup via a precomputed index: micro-state centroids first (closest within tap radius), then bounding-box-gated point-in-polygon tests.
- **`useCameraAnimation`** — phase-driven camera flights in OrbitControls' own azimuth/polar parametrization (pole-safe), with duration proportional to arc length and an expert-loss reveal that flies to the missed country.

Controls are tuned per input class: rotate speed scales with zoom for close-up precision, and coarse-pointer (touch) devices get grippier damping, a deeper zoom floor, wider tap radii for micro-states, and no hover effects (`GLOBE_CONFIG.touch`).

### Design system

The UI is an **instrument panel around the globe**: near-black ground, hairline borders, corner-tick brackets on primary panels, uppercase micro-labels, and every numeric value in a Geist Mono readout. All tokens are defined in `app/globals.css` and documented in [docs/design-system.md](docs/design-system.md). Icons are [Phosphor](https://phosphoricons.com), mapped through `components/ui/icons.tsx` with house defaults.

## Game Rules

### Standard Mode

- Click the country shown in the prompt — 1–5 attempts per country (configurable)
- Wrong guesses highlight red; hints show the name of what you clicked
- Skip between countries with arrow keys (when enabled); per-country timer state is preserved
- Optional countdown timer (5s / 10s / 15s / 30s)

### Expert Mode

- **One wrong click = game over**, with a camera reveal of the country you missed
- Timer locked to 5 seconds, no hints, no skips
- Separate best-score tracking, amber UI channel

### Scoring

Points per country = `triesRemaining / maxTries` — 1.0 for a first-try find, decreasing per miss. Resolutions: **perfect** (first try), **almost** (multiple tries), **failed** (out of tries/time). Final score = points ÷ total countries.

## Project Structure

```
app/
  layout.tsx            # Fonts, metadata, OG/social tags
  page.tsx              # Renders GameContainer
  globals.css           # Design tokens + component classes (see docs/design-system.md)
  icon.svg, manifest.ts # App icons + PWA manifest

components/
  game/
    GameContainer.tsx   # Orchestrator: lifecycle, keyboard, pause, reveal
    start/              # Start screen: MainMenu, SettingsView, BestScoresCard
    game-over/          # Results: GameOver shell, Standard/Expert layouts
    settings/           # Reusable settings controls
    ...                 # HUD: CountryPrompt, ScoreBoard, CountdownTimer,
                        #      TriesIndicator, PauseMenu, feedback overlays
  globe/
    Globe.tsx           # Scene layout
    hooks/              # useCountryTextures, useCountryPicking, useCameraAnimation
    ...                 # Sphere, grid, borders, markers, pulse shader
  ui/
    icons.tsx           # Geist-style icon set
    animated-counter.tsx

lib/
  engine/               # Pure game rules + seeded RNG + tests
  store/                # Zustand adapters (game, settings, stats, projections)
  geo/                  # TopoJSON pipeline, country sets, coords, ISO codes
  hooks/                # useHydrated, useIsCoarsePointer
  constants.ts          # COLORS, GAME_CONFIG, TIMER_CONFIG, GLOBE_CONFIG

data/countries-50m.json # Natural Earth 50m TopoJSON
public/flags/           # 195 SVG country flags
docs/                   # Design system, CI/CD, multiplayer design
```

## Getting Started

```bash
pnpm install      # install dependencies
pnpm dev          # dev server → http://localhost:3000
```

```bash
pnpm test         # unit tests (vitest)
pnpm lint         # ESLint
pnpm exec tsc --noEmit  # type check
pnpm build        # production build
```

## Development Notes

- **Country sets:** edit `lib/geo/country-sets.ts` (ISO 3166-1 numeric codes). Persisted best-score records deep-merge, so new sets are safe for returning players.
- **Game rules:** `GAME_CONFIG` and `TIMER_CONFIG` in `lib/constants.ts`. Engine changes belong in `lib/engine/` with test coverage.
- **Globe feel:** camera, zoom, and touch tuning all live in `GLOBE_CONFIG`.
- **Persistence:** settings and stats persist to localStorage (versioned). Clear site storage to reset.

## CI/CD & Deployment

GitHub Actions: PR checks (lint, type check, tests, build) with Vercel preview deployments, and automatic production deploys with semantic versioning from commit prefixes (`feat:` → minor, `fix:` → patch, `BREAKING CHANGE:` → major). Full setup guide in [docs/cicd-setup.md](docs/cicd-setup.md).

The running version is shown at the bottom of the settings menu (injected via `NEXT_PUBLIC_APP_VERSION`).

## Roadmap

The next major milestone is a **head-to-head multiplayer race**: both players get the same seeded country sequence, first correct click claims the country. The engine's purity, seeded determinism, and deadline-based timing were built for exactly this — an authoritative game server will run the same `lib/engine` code. Design doc: [docs/multiplayer-design.md](docs/multiplayer-design.md).
