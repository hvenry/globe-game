# Player Colors

The per-player identity colors in race mode, on the globe and in the UI.

## Why
In a race, every claimed country and every roster row has to say who it belongs to at a glance.
The colors must never be confused with the result vocabulary (green / yellow / red), or a claim would read as a verdict.

## How it works
Defined in `lib/constants.ts`, not CSS, because the globe needs them as hexes.

| Id | `PLAYER_COLORS.claim` | Ink, dark | Ink, light |
|---|---|---|---|
| `blue` | `#1d4ed8` | `#60a5fa` | `#1d4ed8` |
| `purple` | `#a855f7` | `#c084fc` | `#7e22ce` |
| `orange` | `#f97316` | `#fb923c` | `#c2410c` |
| `cyan` | `#06b6d4` | `#22d3ee` | `#0e7490` |

- **Globe:** `raceFills` floods a claimed country in its claimant's `claim` hex at the theme's `fillOpacity.perfect`.
  A miss stipples the live country with dots (`pattern: "dots"`) in the same hex at `fillOpacity.wrongGuess`, so "tried" never passes for a claim.
  A country nobody claimed takes the solo `failed` red.
- **Identity marks:** `PlayerDot` paints the `claim` hex in every roster, standing, and feed row.
- **Text:** `usePlayerInk()` returns `PLAYER_INKS[theme]`.

## Key files
- `lib/constants.ts` - `PLAYER_COLORS`, `PLAYER_INKS`, `PLAYER_COLOR_IDS`
- `lib/store/race-store.ts` - `raceFills`, `usePlayerInk`
- `components/race/PlayerDot.tsx` - identity dot

## Decisions and gotchas
- No single hex clears 3:1 on both the black and the white panel, so ink splits per theme (the same reason `--expert-ink` exists).
- One color per seat: rooms hold up to four players, one per color.
- `PLAYER_COLORS.*.attempt` (paler variants) is defined but unused, although its comment says wrong clicks use it.

## Related
- [Scene palette](design-scene-palette.md)
- [Design tokens](design-tokens.md)
- [Race client](race-client.md)
