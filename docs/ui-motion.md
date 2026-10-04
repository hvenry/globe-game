# UI Motion

The CSS animation utilities and press feedback used across the DOM UI.

## Why
Motion signals state changes (a verdict, a new feed row, a timer running low) without adding chrome.
Keeping every keyframe in one place keeps durations and easing consistent and makes unused animations easy to spot.

## How it works
Animations are unlayered utilities at the bottom of `app/globals.css`.

| Class | Effect | Used in |
|---|---|---|
| `animate-fade-in-up` | 8px rise + fade in, 0.3s | `CountryPrompt`, `ResultFeedback`, `PauseMenu`, `GameOver` |
| `animate-fade-in-out-up` | Rise in, hold, rise out, 2s | `ResultFeedback`, `RaceHud` |
| `animate-feed-in` | Slide in from right, fade near end; length from `--feed-ttl` (default 4.5s) | `RaceFeed` |
| `animate-shake` | ±4px horizontal shake, 0.3s | `TriesIndicator` |
| `animate-pulse-glow` | Opacity 0.6 ↔ 1, 1s loop | Status dots (`MainMenu`, `BestScoresCard`, `SettingsControls`) |
| `animate-loading-dot` | Dots brighten in turn (delay set inline), 1.2s | `LoadingScreen` |
| `animate-timer-pulse` | Scale 1 ↔ 1.05, 0.6s loop | `CountdownTimer` |
| `animate-shimmer-signal` / `-gold` | Gradient sweep, 3s / 4s loop | `BestScoresCard`, `SettingsControls` |
| `animate-flash-brackets` | Step blink, 2s loop | Unused |

Component-layer motion:
- `.stagger` - staggered `fadeInUp` for panel children (60ms steps, first six children).
- `.press` - `:active` scale(0.96), skipped when `:disabled`.

## Key files
- `app/globals.css` - keyframes and `animate-*` utilities
- `components/race/RaceFeed.tsx` - sets `--feed-ttl` per row

## Decisions and gotchas
- `.press` needs `transition-all` or `transition-transform`; a colors-only transition makes the scale snap.
- `animate-flash-brackets` has no callers; remove it or use it.
- Globe-side motion (pulse tint, marker pulse, camera flights) is driven in `useFrame`, not CSS.

## Related
- [UI components](ui-components.md)
- [HUD](ui-hud.md)
- [Globe rendering](globe-rendering.md)
