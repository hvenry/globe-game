# Country Data

How country shapes, ids, names, sets and coordinates get from a TopoJSON file into the game.

## Why

The globe, the picker, the engine and the race server all need to agree on which countries exist and what they are called.
One pipeline with one id scheme keeps them in sync, and pure set logic lets the browser and server draw identical countries.

## How it works

- `data/countries-50m.json` (Natural Earth 50m) is parsed by `topojson-client` into `CountryFeature[]` in `getAllFeatures()`, cached after the first call.
- Ids are ISO 3166-1 numeric codes as strings (`"840"` is the USA).
  - Kosovo has none, so the pipeline assigns `"383"`.
  - A repeated id gets a `_<index>` suffix; `baseId()` strips it.
    The engine and stores only ever use base ids.
- Tuvalu (`"798"`) isn't in the 50m data, so a synthetic `Point` feature is appended and drawn as a marker.
- `COUNTRY_NAMES` holds display names for the 195 guessable states; `GUESSABLE_IDS` is its key set.
  `getGuessableCountries()` returns one `CountryData` per guessable base id.
- Country sets come in four kinds:
  - `continent`: the six continents, which partition the world; `WORLD_IDS` is their union.
  - `region`: overlapping drills (Balkans, Nordics, ...).
  - `draw`: a seeded sample of the world (Quick 10, Sprint 25, Daily 20).
  - `ranked`: top 10/25/50/100 by area or population.
- `idsFor(setId, seed)` resolves any set to concrete ids.
  `seedFor` swaps in `dailySeed()` (the UTC date as `YYYYMMDD`) for daily draws, so everyone gets the same Daily 20.
- Coordinates follow `three-geojson-geometry`: `[lng=0, lat=0]` sits on the +X axis.
  All conversions go through `lib/geo/coords.ts`.
- `SMALL_COUNTRIES` in `lib/constants.ts` lists micro-states that get 3D marker spheres and a wider click radius.
- Flags are SVGs in `public/flags/<alpha2>.svg`, resolved via `ISO_NUMERIC_TO_ALPHA2`.
  An unmapped id falls back to `/flags/fallback.svg`, which doesn't exist in `public/flags/`.

## Tech

- Natural Earth 50m TopoJSON, `topojson-client`.
- d3-geo for projection and point-in-polygon (in the globe hooks).
- Three.js vectors in `coords.ts`.

## Key files

- `lib/geo/countries.ts` - TopoJSON parse, dedupe, Kosovo and Tuvalu fixes, `baseId`.
- `lib/geo/country-names.ts` - display names and `GUESSABLE_IDS`.
- `lib/geo/country-sets.ts` - set definitions, `setSize`, `WORLD_IDS`.
- `lib/geo/country-stats.ts` - area and population for ranked sets.
- `lib/geo/draws.ts` - `idsFor`, `seedFor`, `dailyKey`, `dailySeed`, `rankedIds`.
- `lib/geo/coords.ts` - `pointToCoords`, `coordsToPosition`, `lngLatToCameraPos`.
- `lib/geo/iso-codes.ts` - numeric to alpha-2 map and flag paths.

## Decisions and gotchas

- Set sizes are derived, never written down, so they can't drift from the lists.
- The race server builds its pool from continents, so every guessable id must sit in exactly one continent.
- `draws.ts` and `country-sets.ts` are bundled into the Worker: keep them pure, with relative imports.
- Never duplicate coordinate math in components; `coords.ts` is the single source of truth.
- `/data/countries-50m.json` is listed in `.gitignore` but tracked anyway, so edits to it still show up in git.

## Related

- [Game engine](game-engine.md)
- [Globe rendering](globe-rendering.md)
- [Race server](race-server.md)
