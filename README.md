# globe.expert

A geography game on an interactive 3D globe: find each country by clicking it.

[![globe.expert](https://globe.expert/og.png)](https://globe.expert)

## Features

- All 195 UN-recognized states on a real sphere, micro-states included
- Timed solo runs, regional sets and a Daily 20
- Expert mode: one wrong click ends the run
- Live races for 2-4 players: the first correct click claims each country
- Server-authoritative races on the same pure, seeded engine as solo

## Quick start

```bash
pnpm install    # install dependencies
pnpm dev        # app at http://localhost:3000
pnpm race:dev   # race server at http://localhost:8787, only needed for /race
```

## Docs

- [Game engine](docs/game-engine.md) - the pure, deterministic rules behind every game
- [Race mode](docs/race-mode.md) - multiplayer rules, phases and scoring
- [Race server](docs/race-server.md) - the Cloudflare Worker and one Durable Object per room
- [Globe rendering](docs/globe-rendering.md) - how country fills, borders and picking work on a sphere
- [Design system](docs/design-system.md) - the instrument-panel UI and its tokens
