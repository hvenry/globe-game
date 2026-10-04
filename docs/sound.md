# Sound

Web Audio cue playback for solo and race, driven from store transitions, plus a lab for picking each cue's file.

## Why

Sound triggers scattered across components drift between solo and race and are hard to retune.
Naming every cue in one table and firing them from one place keeps the vocabulary consistent and lets files change without code changes.

## How it works

- Components and the director speak in **cue names** (`solo.correct`, `race.claim.other`, ...); only `cues.ts` maps names to files.
- `config.json` holds the picked file per cue; `cues.ts` reads it and adds group, gain, rate range, rate limit and lab candidates.
- `engine.ts` owns one `AudioContext`:
  - `unlockAudio()` creates or resumes it on the first user gesture.
  - Buffers are fetched from `/audio/` and decoded once.
  - A master gain with one sub-gain per group (`ui`, `game`) gives a single volume and mute control.
  - `play(cue)` respects `minIntervalMs` unless `force` is set, and skips files that fail to load.
- `SoundDirector` is the only trigger point.
  - It subscribes to the game and race stores outside React render and plays cues on transitions.
  - A capture-phase click listener gives every `<button>` `ui.click`, unless it sets `data-sound="<cue suffix>"` or `data-sound="none"`.
  - GameContainer mounts it once.
- The `/sound` lab lists each cue's candidates; picking one plays it and stores a localStorage override that the game uses immediately.
  "Copy config" exports the cue-to-file map to paste into `config.json`.
- `scripts/build-audio.sh` turns raw packs in `audio-wip/` into loudness-normalised mono MP3s in `public/audio/`.
  - Default: only the files named in `config.json`, keeping the shipped set small.
  - `--all`: every file, for a lab session.
  - Both regenerate `lib/sound/library.ts`.

## Tech

- Web Audio API (`AudioContext`, `GainNode`, `AudioBufferSourceNode`).
- ffmpeg (`loudnorm`, `libmp3lame`) for the build script.

## Key files

- `lib/sound/cues.ts` - cue vocabulary and groups.
- `lib/sound/config.json` - picked file per cue.
- `lib/sound/engine.ts` - context, buffers, gains, `play`, overrides.
- `lib/sound/library.ts` - generated list of shipped files.
- `components/sound/SoundDirector.tsx` - the single trigger point.
- `components/sound/SoundLab.tsx` - the `/sound` lab.
- `scripts/build-audio.sh` - raw packs to shipped MP3s.
- `SOUND_CONFIG` in `lib/constants.ts` - default on/volume and volume ramp.

## Decisions and gotchas

- MP3, not Ogg: Safari doesn't support Ogg.
- `audio-wip/` is gitignored; `public/audio/` is tracked.
  Building without the raw packs fails with "missing source".
- Volume changes ramp over `volumeRampSeconds` so the slider never clicks.
- Lab overrides persist until cleared, so a stale override can mask a `config.json` change while testing locally.
- Add new cues to `cues.ts` and `config.json`, then trigger them from `SoundDirector`, not from components.

## Related

- [State stores](state-stores.md)
- [Race client](race-client.md)
