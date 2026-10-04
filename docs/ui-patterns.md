# UI Patterns

Recurring layout and interaction patterns built from the component classes.

## Why
The classes say what a surface looks like; these patterns say how screens are put together.
Following them keeps new dialogs and menus consistent with solo, race, and settings without re-deciding each time.

## How it works
- **Primary button:** `.btn-primary` + `.btn-signal` or `.btn-expert` by mode.
- **Settings behind a panel:** a dialog that owns live settings puts a `.btn-icon` top-right and swaps its whole body for the controls, rather than stacking a second panel.
  Escape backs out one rung, so the view is the caller's state.
  Solo's pause menu and the race menu use this.
- **Panel headers:** a `.btn-icon` each side of a centered `.hud-label` title; an empty `h-7 w-7` box stands in for a missing one.
- **Mobile scale:** dialogs and HUD are sized down at the base and restored at `md:`, so on a phone the chrome doesn't cover the globe.
- **Cell grids:** `grid gap-px bg-hairline` with `bg-well` children; 1px gaps read as engraved separators (mode/set selector, results breakdown).
- **Status dot:** 1-1.5px rounded dot in the channel color with `animate-pulse-glow`, always paired with a label.
- **Chrome controls** (menu button, back arrow, theme indicator, HUD skip arrows): `text-mid` → `hover:text-hi`, never a channel color.
- **Scroll scrim** (settings panel): a `from-panel` gradient into the footer line, dark only.
- **Emphasis:** never blurred glows.

## Key files
- `components/ui/PanelHeader.tsx` - the panel header pattern
- `components/game/PauseMenu.tsx` - settings-behind-a-panel in solo
- `components/race/RaceMenu.tsx` - settings-behind-a-panel in race
- `components/game/start/` - cell grids, status dots, scroll scrim

## Decisions and gotchas
- Coloring navigation by mode implies the control is *about* the mode, so chrome controls stay neutral.
- The scroll scrim matches the opaque dark panel exactly.
  On light frosted glass any wash reads as a slab, so light has none.

## Related
- [UI components](ui-components.md)
- [HUD](ui-hud.md)
- [Design system](design-system.md)
