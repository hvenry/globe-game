# Design System

The "mission control" visual language: the UI is an instrument panel around the globe.

## Why
The globe is the product, so the chrome has to stay quiet, precise, and technical.
Without shared rules, every panel picks its own colors and weights and starts competing with the map.
One token set also lets the whole UI swap between normal and expert mode, and between dark and light, without per-component work.

## How it works
1. **The globe is the hero.**
   Panels are small and pinned to edges; nothing competes with the map.
2. **Numbers are readouts.**
   Every numeric value is Geist Mono with tabular figures (`.readout`).
   Text is Space Grotesk.
3. **Color is status, not decoration.**
   - Signal green: normal mode.
     Gold: expert mode.
   - Emerald: perfect resolutions only (matches globe fills).
     Yellow: caution / almost.
     Red: alert / failed.
   - Everything else is a text step on a surface.
4. **Hairlines, not shadows.**
   Depth comes from 1px borders and surface steps, not drop shadows.

Every accent has an expert twin.
Components take the mode and swap `signal` ↔ `expert` classes wholesale.

Two themes, dark (default) and light, are different worlds, not inversions:

| | Dark | Light |
|---|---|---|
| Ground | true black | pale blue |
| Globe | unlit black sphere, starfield | blue ocean + green land, no stars |
| Borders | grey hairlines on black | near-black outlines |
| Panels | opaque black | frosted white glass |

**Voice:** labels are short, uppercase, and factual ("FIND THIS COUNTRY", "RUN COMPLETE", "BEST 57%").
No exclamation marks outside gameplay feedback.

**Icons:** Phosphor, mapped through `components/ui/icons.tsx` with house defaults (16px, regular weight).
Import from that module, never from the package, so the set can be re-weighted or swapped in one place.

## Tech
- Tailwind CSS 4: `@theme inline` maps CSS custom properties to utilities (`--color-panel` → `bg-panel`).
- Space Grotesk (display) and Geist Mono (readouts).
- `@phosphor-icons/react`.

## Key files
- `app/globals.css` - every token, component class, and animation
- `components/ui/icons.tsx` - icon mapping and defaults
- `components/ThemeSync.tsx` - mirrors the theme setting onto `<html data-theme>`
- `lib/constants.ts` - `SCENE_PALETTES`, `PLAYER_COLORS`, `PLAYER_INKS` (colors the GPU or the globe need as hexes)

## Related
- [Design tokens](design-tokens.md)
- [UI components](ui-components.md)
- [HUD](ui-hud.md)
- [UI patterns](ui-patterns.md)
- [UI motion](ui-motion.md)
- [Scene palette](design-scene-palette.md)
- [Player colors](player-colors.md)
