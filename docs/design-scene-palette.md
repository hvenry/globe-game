# Scene Palette

The per-theme colors, line weights, fill opacities, and lighting for the 3D globe.

## Why
A WebGL material can't read a CSS custom property, so the scene needs its own palette that tracks the theme.
Without it, the globe would keep dark-mode colors under a light UI, or each layer would hard-code its own values.

## How it works
`SCENE_PALETTES` in `lib/constants.ts` holds one palette per theme, read through `useSceneColors()`.

| Key | Dark | Light | Why |
|---|---|---|---|
| `land` | `null` | `#59cf67` | `null` keeps the dark globe bare |
| `globeBase` | `#0A0A0A` | `#1e82d2` | Void vs ocean |
| `borderOpacity` | 0.7 | 0.95 | On a colored map the outlines carry the contrast |
| `hoverOpacity` | 0.22 | 0.5 | A white wash needs more strength over land than over black |
| `fillOpacity` | 0.5-0.65 | 0.8-0.88 | A translucent fill over colored land shifts hue; over black it only darkens |
| `outOfSetScale` | 0.1 | 0 | Dark needs a dim outline for the rest of the world; light leaves it as open sea |
| `unlit` | false | true | A painted globe takes form from outlines; lighting a flat palette drags it toward mud |

- **Light fills diverge from the DOM channels.**
  Text on white needs dark accents; a fill on green land needs bright ones.
  A cleared country goes **white** (reads as erased), since green-for-correct is invisible on land.
  Almost is `#facc15`; wrong and failed stay red (`#dc2626`).
- **Continent modes in light** paint only the active set as land, so the playfield is the only landmass on the planet.

## Tech
- three.js materials via React Three Fiber.

## Key files
- `lib/constants.ts` - `SCENE_PALETTES`, `GLOBE_LAYER`
- `lib/hooks/useSceneColors.ts` - theme → palette
- `components/globe/Globe.tsx` - `<Canvas flat>` and layer mounting

## Decisions and gotchas
- **`<Canvas flat>`** disables R3F's default ACES tone mapping, which desaturates midtones.
  With `flat` + `unlit`, the ocean renders at exactly its declared `#1e82d2`.
- **Layer order:** every transparent layer is an origin-centered sphere, so three.js tie-breaks on creation order.
  The light-only land layer mounting late once hid every fill until reload.
  `GLOBE_LAYER` assigns explicit `renderOrder` values; any new globe layer needs an entry.

## Related
- [Design tokens](design-tokens.md)
- [Player colors](player-colors.md)
- [Globe rendering](globe-rendering.md)
