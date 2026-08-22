# Design System — "Mission Control"

The globe.expert interface is an **instrument panel around the globe**: the
globe is the hero, the chrome is quiet, precise, and technical. Every visual
decision flows from that framing.

All tokens live in `app/globals.css` under `@theme` (Tailwind 4), so each one
generates utilities automatically (`--color-panel` → `bg-panel`,
`--radius-control` → `rounded-control`, `--font-data` → `font-data`).

## Theming

Two themes, toggled by the sun/moon indicator in the settings header
(mirroring the back button) and persisted with the rest of the settings. They are **different worlds, not inversions**:

| | **Dark** (default) | **Light** |
|---|---|---|
| Ground | true black (`#000`) | off-white |
| Globe | unlit black sphere, starfield | blue ocean + green land, no stars |
| Lighting | dramatic terminator | near-flat |
| Borders | grey hairlines glowing on black | near-solid black outlines |
| Corner ticks | 20% white | full black |

### How it works

Raw values are plain custom properties: dark on `:root` (so a no-JS render is
still the real design), light under `[data-theme="light"]`. The `@theme
inline` block maps them to utilities — because it is `inline`, the utilities
emit the raw `var()` reference, so flipping the attribute re-themes everything
live, with no rebuild and no reload.

- `ThemeSync` mirrors the setting onto `<html data-theme>`.
- An inline script in `app/layout.tsx` sets the same attribute before first
  paint, so there is no flash.

**Colors that get alpha composed onto them** (`--line`, `--signal`,
`--expert`, `--success`, `--caution`, `--alert`) are stored as space-separated
RGB channels, so `rgb(var(--signal) / 0.4)` works anywhere — arbitrary
Tailwind values, `@keyframes`, SVG attributes. Surfaces and text steps are
stored as finished colors; they are never alpha-composed, and light mode needs
opaque steps rather than alphas of one hue.

### Writing light values

Light is not an inversion, and these three asymmetries matter:

1. **Surfaces step the other way.** Dark separates ground → panel → well by
   *lightening*; light has to *darken*. So the light ground gives up pure
   white — from `#fff` all three surfaces collapse into one flat sheet.
   Symmetrically, the dark ground *is* true black: any grey in it reads as
   haze behind the globe, and panels step up only a few points from there.
2. **Hairlines need more alpha** (0.09 → 0.16). A black line on white reads
   weaker than a white line on black, which blooms.
3. **Accents drop two steps.** `#22d3ee` on white is ~1.9:1. Light mode uses
   green-700 for signal and a deep gold (`154 114 9`) for expert — amber-700
   read as rust. That gold is about as golden as the hue gets while still
   carrying near-white button text at 4.5:1; the channel has to work as a
   *fill*, not only as a label.

### Globe layer order

Every transparent layer on the globe — graticule, atmosphere, land, fills,
hover, pulse, borders, markers — is a sphere centred on the origin, so they all
sort to the same depth and three.js tie-breaks on **object id, i.e. creation
order**. That makes the stack silently dependent on mount order: the land map
exists only in the light theme, so switching themes mounted it *after* the fill
layers, where it sorted in front and hid every resolved/wrong-guess colour
until a reload. `GLOBE_LAYER` in `lib/constants.ts` assigns explicit
`renderOrder` values so the stack is fixed regardless of when a layer mounts.
Any new globe layer needs an entry there.

### The scene is themed separately

A WebGL material can't read a CSS custom property, so the globe has a parallel
palette: `SCENE_PALETTES` in `lib/constants.ts`, read through
`useSceneColors()`. It covers colors, line weights, the light rig, and whether
the globe is lit at all. `land: null` is what keeps the Dark globe bare.

**Light renders `unlit`.** It is a painted sticker globe — vivid grass green on
a saturated blue — and a painted globe has no light source in its own fiction:
its form comes from the near-black outlines and the graticule, not from
shading. Lighting a flat palette measurably drags it toward mud; before this,
the ocean was rendering at 0.31× its palette value. Dark stays lit, where a
dramatic terminator is the whole look.

The `<Canvas>` is also `flat`, which disables React Three Fiber's default ACES
filmic tone mapping. ACES is built for photographic HDR and rolls off and
desaturates midtones — wrong for flat colour. With both changes the scene
renders its palette values exactly: the ocean measures `rgb(30, 130, 210)`
against a declared `#1e82d2`.

In continent modes the light globe paints **only the active set as land** —
everything else is left unpainted so the ocean sphere shows through and the
playfield becomes the only landmass on the planet. `outOfSetScale` is
therefore `0` in light (a dimmed outline would just be grey lines floating in
the sea) and `0.1` in dark, where the dimmed outline is the only way the rest
of the world reads at all.

Light carries its contrast in the borders (`borderOpacity` 0.95, near-black)
because on a coloured map the outlines are what separate one country from the
next; Dark carries it in the fills, against the void. Hover is a white wash in
both, but light needs twice the strength (`hoverOpacity` 0.5 vs 0.22) to show
over land rather than over black.

In Dark the two halves use the same status colors — green, yellow, red — for
the same three outcomes. **Light deliberately diverges**, and it's worth
knowing why: text on a white panel needs *dark* accents to stay legible, while
a fill on a green landmass needs *bright* ones. Green-for-correct is the
clearest case, since it is invisible on land, so a cleared country goes
**white** instead and reads as erased from the map. Yellow brightens to
`#facc15`; red stays red.

Fill opacity is per-theme too (`fillOpacity`). A translucent fill over
coloured land picks up the land and shifts hue, where over a black globe it
only darkens — so Light paints at 0.8–0.88 to keep its status colors true,
where Dark stays at 0.5–0.65.

### Chromeless HUD

In-game HUD readouts are drawn straight onto the scene with no panel behind
them, so a single line of text can cross the page *and* the globe. No fixed
ink is legible across that whole range, so the contrast comes from a frosted
plate instead: **`.hud-glass`** (`--hud-glass`, `--hud-glass-blur`) blurs and
tints whatever is behind toward the panel surface, and the ink stays one fixed
color per theme (`--hud-ink`).

In Dark the plate is a 40% black wash — invisible against the true-black
ground, and only doing work where the HUD crosses a lit country. In Light it
is a 72% white wash, which is what lets near-black ink sit over the mid-blue
ocean.

Keep the plate borderless and low-contrast: it should read as the scene going
soft behind the text, not as another panel. Status-coloured HUD elements
(timer dial, tries pips, result verdict) keep their channel colors — the plate
supplies the contrast, so they never need inverting.

*Rejected:* `mix-blend-mode: difference` on the HUD. It guarantees contrast
arithmetically, but over a coloured globe it resolves to complementary hues
rather than white, inverts the flag, and would turn a red "Incorrect" cyan.

## Principles

1. **The globe is the hero.** Panels are near-opaque, small, and pinned to
   edges; nothing competes with the map.
2. **Numbers are readouts.** Every numeric value renders in Geist Mono with
   tabular figures (`.readout`). Text is Space Grotesk.
3. **Color is status, not decoration.** Grass green = normal-mode signal,
   amber = expert channel (a complementary pair), green = perfect
   resolutions only (matching the globe fills), yellow = caution/almost,
   red = alert/failed. Everything else is a step of the text ramp on the
   surface ramp.
4. **Hairlines, not shadows.** Depth comes from 1px borders and surface
   steps, not drop shadows or heavy blur.

## Tokens

### Typography

| Token | Utility | Use |
|---|---|---|
| `--font-sans` (Space Grotesk) | `font-sans` (default) | Headings, names, buttons |
| `--font-data` (Geist Mono) | `font-data` / `.readout` | All numerals, versions, counters |
| `--text-label` (10px / 0.18em tracking) | `text-label` / `.hud-label` | Uppercase micro-labels |

### Surfaces & lines

Dark values shown; the light column lives in the `[data-theme="light"]` block.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--color-ground` | `#000000` | `#f1f3f5` | Page + canvas backdrop |
| `--color-panel` | `#08090c` | `#ffffff` | Floating panels (96% + blur) |
| `--color-well` | `#030405` | `#e7eaee` | Inset areas within panels |
| `--color-hairline` | white 9% | black 16% | Default borders, separators |
| `--color-hairline-strong` | white 20% | black 36% | Hover borders, rules |
| `--tick-alpha` | 0.2 | 1 | Corner-bracket strength |

### Text steps

`--color-hi` (primary) → `--color-mid` (60%) → `--color-low` (38%) →
`--color-faint` (20%). Pick the lowest step that stays legible.

### Status channels

| Token | Value | Use |
|---|---|---|
| `--color-signal` / `--color-signal-soft` | `#3ddc84` | Normal mode, primary actions |
| `--color-expert` / `--color-expert-soft` | `#f5a623` | Expert mode: fills, bars, dots |
| `--color-expert-ink` | `#f5a623` dark / `#9c6d00` light | Expert mode **text** |
| `--on-signal` / `--on-expert` | — | Type that sits *on* a channel fill |
| `--color-success` | `#10b981` | Perfect resolutions (mirrors globe fills) |
| `--color-caution` | `#eab308` | Almost resolutions, timer warning |
| `--color-alert` | `#ef4444` | Failed, wrong guesses, expert loss |

Every accent has an expert-mode twin: components take the mode and swap
`signal` ↔ `expert` classes wholesale.

**Gold splits in light mode.** A gold vivid enough to read as gold on a white
panel is far too pale to put text on, and one dark enough for text is the
muted bronze that made the channel look faded. So `--expert` is the fill and
`--expert-ink` is the text; dark mode needs no split, since a bright gold on
black works as both. Green needs no split either — green-700 is dark enough
to be text *and* carry white type as a fill.

Because a fill's readable type is a property of the channel and not of the
theme's ground, `.btn-signal` / `.btn-expert` carry the fill together with
`--on-signal` / `--on-expert`. Don't put `text-ground` on a channel button.

### Shape

| Token | Value | Use |
|---|---|---|
| `--radius-panel` | 0 (squared) | Panels |
| `--radius-control` | 2px | Buttons, inputs, option grids |

## Component classes

Defined in `@layer components`:

- **`.panel`** — floating surface: `--surface-panel` at `--panel-opacity`,
  hairline border, `rounded-panel`, and a `--panel-blur` backdrop. Light is
  real frosted glass (78% / 26px, backdrop *desaturated* to 65% so the card
  reads neutral instead of taking on whatever ocean sits behind it); dark is
  fully opaque, where a translucent panel read as a grey card floating in
  front of the void.

  **Write `backdrop-filter` unprefixed.** Hand-writing the `-webkit-` pair
  makes Lightning CSS collapse it to the prefixed property alone and silently
  drop the blur outside WebKit — it adds the prefix itself.
- **`.panel-ticks`** — corner-bracket marks (the signature), drawn at
  `--tick-alpha`. Use *only* on primary surfaces: start menu, results, pause. In-game HUD elements are
  chromeless — bare text and marks over the scene.
- **`.hud-label`** — uppercase 10px label, 0.18em tracking, low text step.
- **`.readout`** — Geist Mono + tabular numerals.
- **`.hud-rule`** — label with a hairline extending right (section headers).
- **`.stagger`** — staggered fade-in-up for panel children (60ms steps).
- **`.panel-dialog`** — shell sizing for the three modal dialogs (start menu,
  pause, results): narrow and tight on mobile, full size from `md:`. Pair with
  `.panel` + `.panel-ticks`, which supply the surface and the marks.
- **`.btn-primary` / `.btn-ghost` / `.btn-quiet`** — action-button geometry and
  type. The channel *fill* stays inline on primary buttons, since it swaps
  with expert mode; everything else lives in the class so the dialogs stay in
  step when sizes change.
- **`.hud-glass`** — frosted backing for chromeless HUD readouts (see above).
- **Scroll scrim** (settings panel) — a `from-panel` gradient fading content
  into the footer line. **Dark only.** It works there because the panel is
  opaque, so a wash of the panel colour matches the surface exactly. The light
  panel is frosted glass, where any wash — solid or blurred — reads as a slab
  laid over the options rather than a fade, so light has no scrim at all.
- **`.veil`** — full-screen wash behind a modal panel. Heavy in dark, where the
  panel is opaque and the veil is the only thing pushing the game back; light
  and barely blurred in light, where the panel is frosted glass and a heavy
  veil pre-blurs the globe into a flat wash, leaving the panel's own blur
  nothing to work on.
- **`.press`** — `:active` scale for any control, skipped when `:disabled`.
  Needs a `transition-all`/`transition-transform` utility alongside it; a
  colours-only transition makes the scale snap.

## Patterns

- **Primary button:** `.btn-primary` plus a channel fill (`bg-signal` /
  `bg-expert`), `text-ground`, glow on hover.
- **Ghost button:** `.btn-ghost` — hairline border, label type, brightens on
  hover. **Quiet/destructive:** `.btn-quiet`, hovering toward `text-alert`.
- **Mobile scale:** dialogs and HUD are sized down at the base and restored at
  `md:`, not the other way round — the globe is the hero, and on a phone the
  chrome was covering it.
- **Cell grids:** `grid gap-px bg-hairline` with `bg-well` children — 1px
  gaps read as engraved separators (see mode/set selector, results
  breakdown).
- **Status dot:** 1–1.5px rounded dot in the channel color with
  `animate-pulse-glow`, always paired with a label.
- **Chrome controls** (menu button, settings back arrow, theme indicator, HUD
  skip arrows) take `text-mid` → `hover:text-hi`, never a channel colour.
  Colouring navigation by mode implies it is *about* the mode.
- **Attention ring:** to point at a section (deep links), apply
  `.animate-highlight-ring` — a stark 1px signal border that fades out.
  Never use blurred glows for emphasis.

## Icons

[Phosphor](https://phosphoricons.com) (`@phosphor-icons/react`), mapped
through `components/ui/icons.tsx` so every glyph ships with house defaults
(16px, regular weight) and the whole set can be re-weighted or swapped in one
place. Import icons from that module, never from the package directly.

## Voice

Labels are short, uppercase, and factual: "FIND THIS COUNTRY",
"RUN COMPLETE", "BEST 57%". No exclamation marks outside gameplay feedback.
