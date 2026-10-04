# Design Tokens

The CSS custom properties for type, surfaces, text, status color, and shape, in dark and light.

## Why
Every UI color and size resolves to one of these tokens, so a theme flip or a mode swap is a single attribute or class change.
Hard-coded values drift between themes and break the light mode first.

## How it works
- Raw values are plain custom properties: dark on `:root` (so a no-JS render is the real design), light under `[data-theme="light"]`.
- `@theme inline` makes utilities emit the raw `var()`, so flipping the attribute re-themes live with no rebuild.
- An inline script in `app/layout.tsx` sets `data-theme` before first paint (no flash); `ThemeSync` keeps it in step with the setting.

**Typography**

| Token | Utility | Use |
|---|---|---|
| `--font-sans` (Space Grotesk) | `font-sans` (default) | Headings, names, buttons |
| `--font-data` (Geist Mono) | `font-data` / `.readout` | All numerals, versions, counters |
| `--text-label` (10px / 1rem / 0.18em) | `text-label` / `.hud-label` | Uppercase micro-labels |

**Surfaces and lines**

| Token | Dark | Light | Use |
|---|---|---|---|
| `--color-ground` | `#000000` | `#d7e9fb` | Page + canvas backdrop |
| `--color-panel` | `#000000` | `#ffffff` | Floating panels |
| `--color-well` | `#000000` | `#d3e5f4` | Inset areas within panels |
| `--panel-opacity` / `--panel-blur` | 1 / 12px | 0.78 / 26px | `.panel` surface |
| `--color-hairline` | white 15% | black 16% | Default borders, separators |
| `--color-hairline-strong` | white 32% | black 36% | Hover borders, `.hud-rule` |
| `--tick-alpha` | 1 | 1 | Corner-bracket strength |

**Text steps:** `hi` → `mid` → `low` → `faint`; pick the lowest step that stays legible.

| Step | Dark | Light |
|---|---|---|
| `hi` | `#f2f4f5` | `#09090b` |
| `mid` / `low` / `faint` | `hi` at 60% / 38% / 20% | `#27272a` / `#52525b` / `#a1a1aa` |

**Status channels** (RGB triplets)

| Token | Dark | Light | Use |
|---|---|---|---|
| `--color-signal` | `61 220 132` | `21 128 61` | Normal mode, primary actions |
| `--color-expert` | `245 166 35` | `224 168 26` | Expert fills, bars, dots |
| `--color-expert-ink` | `245 166 35` | `156 109 0` | Expert **text** |
| `--on-signal` / `--on-expert` | `#000` / `#000` | `#fff` / `#0d0a02` | Type on a channel fill |
| `--color-success` | `16 185 129` | `4 120 87` | Perfect resolutions |
| `--color-caution` | `234 179 8` | `161 98 7` | Almost, timer warning |
| `--color-alert` | `239 68 68` | `185 28 28` | Failed, wrong guesses, expert loss |

`-soft` variants (`signal-soft`, `expert-soft`) are the channel at `--accent-soft-alpha` (dark 0.14, light 0.1).

**Shape:** `--radius-panel` is 0 (squared panels); `--radius-control` is 2px (buttons, inputs, HUD plates, option grids).

## Tech
- Tailwind CSS 4 `@theme inline`.
- `rgb(var(--signal) / 0.4)` syntax for alpha on channel colors.

## Key files
- `app/globals.css` - token definitions (`:root`, `[data-theme="light"]`, `@theme inline`)
- `app/layout.tsx` - pre-paint theme script
- `components/ThemeSync.tsx` - setting → `data-theme`

## Decisions and gotchas
- Alpha-composed colors (`--line`, `--signal`, `--expert`, `--expert-ink`, `--success`, `--caution`, `--alert`) are channel triplets, so they work in arbitrary Tailwind values, `@keyframes`, and SVG attributes.
- Surfaces and text steps are finished colors, never alphas: light needs opaque steps, not alphas of one hue.
- **Surfaces step the other way in light.**
  Dark is true black everywhere, since any grey reads as haze behind the globe.
  Light steps down from a white panel to a darker ground and well; on a white ground the surfaces collapse into one sheet.
- **Light hairlines need equal or more alpha.**
  A black line on white reads weaker than a white line on black, which blooms.
- **Light accents drop to darker steps**, since a bright green on white is ~2:1.
- **Gold splits in light.**
  A gold vivid enough to read as gold on white is too pale for text, so `--expert` fills and `--expert-ink` is text.
  Green needs no split: green-700 works as text and fill.
- Signal sits lighter and yellower than `success`; they share the results breakdown, so they separate on lightness.
- Readable type on a fill belongs to the channel: use `.btn-signal` / `.btn-expert`, never `text-ground` on a channel button.

## Related
- [Design system](design-system.md)
- [UI components](ui-components.md)
- [Scene palette](design-scene-palette.md)
