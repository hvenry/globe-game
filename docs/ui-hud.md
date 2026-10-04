# HUD

The chromeless in-game readouts that sit directly on the scene, on frosted plates.

## Why
In-game text can cross both the page and the globe in one line, over black space, ocean, or a lit country.
A normal panel would cover the playfield; bare text would vanish over half of it.
A frosted plate gives contrast without adding another box.

## How it works
- **Plate:** `.hud-glass`, `.hud-card`, and `.hud-pill` blur and tint whatever is behind (`--hud-glass`, `--hud-glass-blur`, `saturate(115%)`).
  - Dark: 40% black, 10px (only does work over a lit country).
  - Light: 72% white, 12px (lets near-black ink sit over mid-blue ocean).
- **Ink:** one fixed color per theme, `--hud-ink` (`#ffffff` / `#09090b`), with `--hud-ink-shadow`.
- Status-colored elements (timer dial, tries pips, verdict) keep their channel colors.

| Class | Role |
|---|---|
| `.hud-card` | The three top surfaces (menu, country, score): plate + one shared padding and type scale, so they share a height and top edge |
| `.hud-card-row` | Holds a card at its base line height (`min-h-[1.25em]`), so a long country name stepping down doesn't shrink the card |
| `.hud-pill` | Secondary readout beneath a card (sequence counter, game clock): plate + `text-label` |
| `.hud-top` | Shared top edge: `max(1rem, safe-area-inset-top)`, `1.5rem` from 48rem |
| `.hud-glass` | The bare plate for any other chromeless readout |

## Key files
- `app/globals.css` - `--hud-*` tokens and HUD classes
- `components/game/` - solo HUD (`CountryPrompt`, `ScoreBoard`, `CountdownTimer`, `TriesIndicator`)
- `components/race/RaceHud.tsx` - race HUD

## Decisions and gotchas
- Keep the plate borderless and low-contrast: it should read as the scene going soft, not another panel.
- *Rejected:* `mix-blend-mode: difference`.
  Over a colored globe it resolves to complementary hues, inverts the flag, and turns a red "Incorrect" cyan.

## Related
- [UI components](ui-components.md)
- [Design tokens](design-tokens.md)
- [UI motion](ui-motion.md)
