# UI Components

The shared CSS component classes for panels, type, buttons, and small utilities.

## Why
Panels, buttons, and labels look identical across solo, race, and the sound lab because they share these classes instead of utility soup.
Changing a button's geometry or a panel's glass is one edit in `globals.css`.

## How it works
All classes live in `@layer components` of `app/globals.css` unless marked unlayered.

**Surfaces**
- `.panel` - floating surface: `--surface-panel` at `--panel-opacity`, hairline border, `rounded-panel`, `blur(--panel-blur) saturate(65%)` backdrop.
- `.panel-ticks` - corner brackets (the signature), drawn at `--tick-alpha`.
  Primary surfaces only: start menu, results, pause, race lobby / menu / results, sound lab.
- `.panel-dialog` - modal shell sizing: narrow on mobile, full from `md:`, `touch-action: pan-y`.
  Pair with `.panel` + `.panel-ticks`.
- `.veil` - full-screen wash behind a modal (`--veil`, `--veil-blur`).
  It has no `position`, so pair it with positioning utilities.

**Type**
- `.hud-label` - uppercase 10px label, 0.18em tracking, `text-low`.
- `.readout` - Geist Mono + tabular numerals.
- `.hud-rule` - label with a dashed `hairline-strong` rule extending right (section headers).

**Buttons**

| Class | Role |
|---|---|
| `.btn-primary` | Primary geometry and type (full width, h-9 / md:h-11, uppercase); pair with a channel class |
| `.btn-signal` / `.btn-expert` | Channel fill + `--on-*` type + hover glow |
| `.btn-ghost` | Hairline-bordered secondary action; brightens on hover |
| `.btn-danger` | Ghost in the alert channel for room-level destructive actions (ending a race for everyone) |
| `.btn-quiet` | Unbordered label-type action; hovers toward `text-alert` (leaving on your own) |
| `.btn-icon` | 7×7 header affordance (back, settings) |
| `.press` | `:active` scale(0.96), skipped when `:disabled`; built into `.btn-primary` / `-ghost` / `-quiet` |

**Other**
- `.progress-track` - 4px rounded `bg-hairline` track for a channel-filled bar (results, pause, race HUD and menu).
- `.scrollbar-hide` (unlayered) - hides the WebKit scrollbar (race menu, `ScrollColumn`).
- HUD plates (`.hud-card`, `.hud-pill`, `.hud-glass`, ...) are covered in [HUD](ui-hud.md).

## Tech
- Tailwind CSS 4 `@layer components`.
- Lightning CSS (via Next) for prefixing.

## Key files
- `app/globals.css` - class definitions
- `components/ui/PanelHeader.tsx` - standard panel header built from `.btn-icon` + `.hud-label`
- `components/ui/ScrollColumn.tsx` - scrolling column using `.scrollbar-hide`

## Decisions and gotchas
- **Write `backdrop-filter` unprefixed.**
  A hand-written `-webkit-` pair makes Lightning CSS drop the blur outside WebKit; it adds the prefix itself.
- Light `.panel` is real frosted glass, desaturated so it doesn't take on the ocean's color.
  Dark `.panel` is fully opaque: a translucent panel read as a grey card floating in the void.
- Dark `.veil` is 40% black at 16px, the only thing pushing the game back behind an opaque panel.
  Light is a 20% wash at 3px, so the frosted panel still has an unblurred backdrop to work on.
- `.press` needs `transition-all` or `transition-transform` alongside it; a colors-only transition makes the scale snap.

## Related
- [Design tokens](design-tokens.md)
- [HUD](ui-hud.md)
- [UI patterns](ui-patterns.md)
- [UI motion](ui-motion.md)
