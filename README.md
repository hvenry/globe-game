# Globe Game (Globe Expert)

A geography quiz game with an interactive 3D globe. Identify countries by clicking on them as they appear on the globe.

Live at [globe.expert](https://globe.expert)

## Overview

Globe Expert is an interactive geography learning tool that challenges players to identify countries by manipulating a 3D globe to select them.

The game features all 195 UN-recognized sovereign states, multiple difficulty modes, time-based challenges, and tracks player statistics across sessions.

**Note:** Tuvalu is rendered as a synthetic marker (green circle) as it's not present in the Natural Earth 50m geographic dataset due to its extremely small size.

## Tech Stack

- **Framework:** Next.js 16 (React 19) - Latest React features with server components
- **Language:** TypeScript - Type-safe development
- **Runtime:** Bun - Fast JavaScript runtime and package manager (replaces Node.js/npm)
- **3D Rendering:** Three.js via React Three Fiber + Drei - WebGL-based 3D globe rendering
- **State Management:** Zustand - Lightweight state management with persistence
- **Styling:** Tailwind CSS 4 - Utility-first CSS with custom theme
- **UI Components:** Radix UI + shadcn/ui - Accessible component primitives
- **Geo Data:** TopoJSON (Natural Earth 50m) - Optimized geographic data format
- **Hosting:** Vercel - Serverless deployment platform

### Why Bun?

This project uses [Bun](https://bun.sh) as the JavaScript runtime and package manager instead of Node.js/npm for:

- **Speed:** ~10x faster package installation and faster script execution
- **Built-in tooling:** Native TypeScript support, bundler, test runner
- **Compatibility:** Drop-in replacement for Node.js with npm package support
- **Developer Experience:** Single tool for runtime, package management, and bundling

## Game Rules

### Standard Mode

- Click on the correct country shown in the prompt
- You have 3 attempts per country
- Wrong guesses are highlighted in red (when hints enabled)
- Countries are shuffled randomly each game
- Navigate between countries with arrow keys (when skips enabled)
- Optional countdown timer (5s, 10s, 30s, 1m, or disabled)

### Expert Mode

- **One wrong click = game over!**
- **Countdown timer locked to 5 seconds**
- No hints or skips allowed
- Separate leaderboard tracking
- Gold/amber UI theme

### Scoring

- **Perfect:** Country found on first attempt (green)
- **Imperfect:** Country found after mistakes (yellow)
- **Failed:** Country not found within attempts/time (red)
- **Accuracy:** Percentage of correct clicks vs total clicks
- **Score:** Percentage of countries found vs total countries

## Game Logic

### Game Flow

```
1. START SCREEN
   ↓ (Select settings & start)
2. PLAYING PHASE
   ↓ (Click country)
3. GUESS VALIDATION
   ├─ Correct → FEEDBACK PHASE (2s) → Next country
   ├─ Wrong → Check remaining tries
   │   ├─ Has tries → Stay in PLAYING
   │   └─ No tries → FEEDBACK PHASE → Next country
   └─ Expert Mode Wrong → GAME OVER
4. All countries done → GAME OVER
```

### State Management (Zustand)

#### Game Store (`lib/store/game-store.ts`)

Core game state and logic:

- **Phase tracking:** idle, playing, feedback, gameover
- **Country management:** Shuffled queue, current country, answered/unanswered
- **Attempt tracking:** Per-country tries remaining, wrong guesses
- **Timer state:** Countdown remaining, pause time, elapsed time
- **Resolution tracking:** Map of country → (perfect|imperfect|failed)
- **Actions:** startGame, makeGuess, goNext/goPrev, handleTimerExpired

#### Settings Store (`lib/store/settings-store.ts`)

Persisted user preferences:

- Country set selection:
  - **All Countries** (195 countries)
  - **Africa** (54 countries)
  - **Asia** (48 countries)
  - **Europe** (44 countries)
  - **North America** (23 countries)
  - **South America** (12 countries)
  - **Oceania** (14 countries)
- Allow skips toggle
- Show hints toggle
- Expert mode toggle
- Timer limit setting

#### Stats Store (`lib/store/stats-store.ts`)

Persistent statistics:

- Games played (normal + expert separate)
- Best scores (normal + expert separate)
- Accuracy tracking

### Timer System

The countdown timer counts down in **seconds** (e.g., 10 → 9.5 → 9.0), with updates every **100ms** for smooth visual animation:

- **Playing phase:** Timer runs and decrements (0.1s per update)
- **Paused:** Timer stops completely (escape key or pause menu)
- **Feedback phase:** Timer pauses during 2s feedback animation
- **Expired (reaches 0):**
  - Normal mode: Country marked as failed, game continues to next country
  - Expert mode: Immediate game over
- **Reset:** Timer resets to limit when moving to next country

Per-country countdown tracking allows navigation between countries (arrow keys) while preserving individual timer states for each country.

### Country Resolution

When a player clicks a country:

1. **Check if already resolved** - Prevent duplicate penalties
2. **Check if already guessed wrong** - Allow reviewing mistakes
3. **Validate guess** - Compare base country IDs (handles dependencies)
4. **Handle correct:**
   - Mark as perfect/imperfect based on tries remaining
   - Remove from unanswered queue
   - Show 2s feedback animation
   - Proceed to next country
5. **Handle incorrect:**
   - Expert mode: Immediate game over
   - Normal mode: Decrement tries, add to wrong guesses
   - Show floating label with country name (if hints enabled)
   - If no tries left: Mark failed, remove from queue

## Project Structure

```
app/
  layout.tsx          # Root layout with fonts, metadata
  page.tsx            # Home page, renders GameContainer
  globals.css         # Global styles, Tailwind config, animations

components/
  game/
    GameContainer.tsx       # Main game orchestrator, handles start/pause/reset
    StartScreen.tsx         # Settings UI, mode selection, timer config
    CountryPrompt.tsx       # Shows current country name and counter
    CountdownTimer.tsx      # Circular progress timer with color states
    ScoreBoard.tsx          # Real-time accuracy and elapsed time display
    TriesIndicator.tsx      # Hearts showing remaining attempts
    ClickFeedback.tsx       # Shows floating country name labels
    ResultFeedback.tsx      # Correct and Incorrect screen feedback
    GameOver.tsx            # Final stats, new best indicators
    PauseMenu.tsx           # Pause overlay with resume/restart/quit

  globe/
    GlobeDynamic.tsx        # Dynamic import wrapper for Globe component
    Globe.tsx               # Three.js canvas setup, camera controls
    GlobeMesh.tsx           # Country polygons, click handling, visual states
    GlobeSphere.tsx         # Base sphere with gradient and stars
    SmallCountryMarker.tsx  # 3D markers for tiny countries

  ui/
    button.tsx, badge.tsx, etc.  # shadcn/ui component primitives

lib/
  geo/
    countries.ts            # Load TopoJSON, parse features, ID mappings
    country-sets.ts         # Predefined country groupings (continents, etc)
    country-names.json      # ISO 3166 numeric code → name mapping
    types.ts                # TypeScript interfaces for country data

  store/
    game-store.ts           # Core game state (Zustand)
    settings-store.ts       # User preferences (Zustand + persist)
    stats-store.ts          # Player statistics (Zustand + persist)

  constants.ts              # Game config, colors, timer settings
  utils.ts                  # Utility functions (shuffle, formatTime, etc)

data/
  countries-50m.json        # TopoJSON world map (Natural Earth 50m resolution)

public/
  # Static assets (fonts, icons, etc)
```

## Key Components

### GameContainer

Central orchestrator that:

- Manages game lifecycle (start, pause, reset, play again)
- Connects game store to UI components
- Handles keyboard shortcuts (escape, arrows)
- Filters countries based on selected country set
- Passes timer limit and expert mode to game store

### Globe System

Three.js-based 3D rendering:

- **GlobeMesh:** Renders country polygons with dynamic colors based on state
  - Default: White with low opacity
  - Wrong guesses: Red highlight
  - Resolved countries: Green (perfect), Yellow (imperfect), Red (failed)
- **SmallCountryMarkers:** Clickable 3D spheres for tiny countries
  - Includes Vatican City, Monaco, Nauru, San Marino, and other micro-states
  - **Tuvalu** is rendered as a synthetic marker (Point geometry at coordinates 179.2°E, 8.5°S) since it's not included in the Natural Earth 50m dataset
- **Raycasting:** Converts mouse clicks to 3D coordinates for country detection
- **Auto-rotation:** Enabled on idle/gameover screens

### Timer Components

- **CountdownTimer:** Left-side circular SVG progress ring
  - Color: Green (100-60%) → Yellow (60-30%) → Red (<30%)
  - Pulse animation when critical (<30%)
  - Only renders when timer enabled
- **ScoreBoard:** Right-side real-time elapsed time display
  - Updates every second
  - Excludes paused time from calculation

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)

### Installation

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Open http://localhost:3000
```

### Build for Production

```bash
# Create optimized production build
bun run build

# Start production server
bun start
```

### Other Commands

```bash
# Type checking
bun run type-check

# Linting
bun run lint
```

## Development Notes

### Adding New Country Sets

Edit `lib/geo/country-sets.ts` and add a new entry with country ISO numeric codes.

**Available continent-based sets:**

- Africa (54 countries)
- Asia (48 countries)
- Europe (44 countries)
- North America (23 countries)
- South America (12 countries)
- Oceania (14 countries)

### Modifying Timer Settings

Update `TIMER_CONFIG` in `lib/constants.ts` for available limits and thresholds.

### Changing Game Rules

Core game constants are in `GAME_CONFIG` (`lib/constants.ts`):

- `maxTries`: Number of attempts per country
- `feedbackDuration`: Length of success/fail animation (ms)
- `totalCountries`: Total countries (195 - includes synthetic Tuvalu marker)

### State Persistence

Settings and stats are automatically persisted to localStorage via Zustand's `persist` middleware. Clear browser storage to reset.

## Performance Considerations

- **Dynamic imports:** Globe component lazy-loads to reduce initial bundle
- **Memoization:** Heavy computations cached with `useMemo`
- **Optimized TopoJSON:** 50m resolution for balance of detail and performance
- **Efficient state updates:** Zustand only re-renders components using changed state slices
- **Animation throttling:** Timer updates at 100ms intervals, not per-frame

## CI/CD & Deployment

This project uses GitHub Actions for automated deployments and semantic versioning.

### Workflow

1. **Feature Development**: Create feature branches (`feature/*`, `fix/*`, etc.)
2. **Pull Request**: Automated checks + preview deployment on Vercel
3. **Merge to Main**: Automatic production deployment with semantic versioning
4. **GitHub Release**: Auto-generated changelog and release notes

### Semantic Versioning

Version bumps are determined by commit message prefixes:

- `feat:` or `feature:` → Minor version bump (0.1.0 → 0.2.0)
- `fix:` or `bugfix:` → Patch version bump (0.1.0 → 0.1.1)
- `BREAKING CHANGE:` or `major:` → Major version bump (0.1.0 → 1.0.0)

Example:

```bash
git commit -m "feat: add multiplayer mode"  # Triggers 0.1.0 → 0.2.0
```

The current version is displayed at the bottom of the game's settings menu. Version is injected at build time via the `NEXT_PUBLIC_APP_VERSION` environment variable.

## Troubleshooting Max Scores

```
// Get the current stats from localStorage
const stats = JSON.parse(localStorage.getItem('globe-game-stats'));

// Set both normal and expert scores to 195 (total countries)
stats.state.bestScores.all = 195;
stats.state.expertBestScores.all = 195;

// Save back to localStorage
localStorage.setItem('globe-game-stats', JSON.stringify(stats));

// Reload the page to see the changes
location.reload();

This will give you 100% in both modes (195/195 countries). The UI should show:
- Gold/amber border with shimmer effect (perfect in both modes)
- Both the green (normal) and amber (expert) percentage displays showing 100%
- The share button in the top-right corner as a badge

To reset back to your actual scores, just clear the localStorage:
localStorage.removeItem('globe-game-stats');
location.reload();
```
