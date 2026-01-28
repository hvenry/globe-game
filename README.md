# Globe Game

A geography quiz game with an interactive 3D globe. Identify countries by clicking on them as they appear on the globe.

Live at [globe.expert](https://globe.expert)

## Tech Stack

- **Framework:** Next.js 16 (React 19)
- **Language:** TypeScript
- **3D Rendering:** Three.js via React Three Fiber + Drei
- **State Management:** Zustand
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI, shadcn/ui
- **Geo Data:** TopoJSON (Natural Earth 50m)
- **Runtime:** Bun
- **Hosting:** Vercel

## Project Structure

```
app/                  # Next.js app router (layout, page, globals)
components/
  game/               # Game UI (prompt, feedback, scoreboard, game over)
  globe/              # 3D globe (mesh, sphere, markers, dynamic loader)
  ui/                 # Shared UI primitives (button, card, dialog, badge)
lib/
  geo/                # Country data loading, types, name mappings
  store/              # Zustand stores (game, settings, stats)
  constants.ts        # Colors, game config, globe config
  utils.ts            # Shared utilities
data/                 # TopoJSON world data
public/               # Static assets
```

## Getting Started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to play.

### Build

```bash
bun run build
bun start
```
