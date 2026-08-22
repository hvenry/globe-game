# Multiplayer Race — Design Foundation

Status: **design target** (not yet built). This document captures the intended
architecture for the head-to-head "live race" mode and how the current
codebase has been prepared for it.

## The game mode

Two (or more) players race on the **same seeded country sequence** on the full
globe:

- Both players see the same prompt at the same time.
- **Claim mechanic:** the first player to correctly click the current country
  *claims* it — they score, everyone else's input for that country is locked,
  and the race rolls over to the next country.
- Wrong clicks cost time (brief per-player lockout) rather than tries.
- End screen shows who claimed which countries, and the fastest claims.

## Architecture

```
apps/web (this repo today)         server (Railway)
┌──────────────────────────┐       ┌─────────────────────────────┐
│ React / R3F globe        │  WS   │ Room manager (Node + ws)    │
│ zustand adapter stores   │◄─────►│ - authoritative engine      │
│ lib/engine (shared)      │       │ - lib/engine (same module)  │
└──────────────────────────┘       │ - seeded shuffle, deadlines │
                                   └─────────────────────────────┘
```

- **Authoritative server.** The server owns the RNG seed, the country order,
  claim resolution (first valid `guess` message wins, server clock decides
  ties), and all scoring. Clients render state and send intents; they never
  decide outcomes. This is what makes the mode cheat-resistant: the client
  only ever says "I clicked country X at my local time T" and the server
  validates it against its own state.
- **Rooms.** One room per match, in-memory state, created via invite link
  (`/race/:roomId`) first; matchmaking can come later. Railway hosts the WS
  server as a separate service in this repo (e.g. `server/` workspace).
- **Shared rules.** `lib/engine` is deliberately pure, deterministic, and
  JSON-serializable so the same code runs on both sides. The race rules will
  live beside the solo rules (`lib/engine/race.ts`) and follow the same
  pattern: `applyX(state, input, now) → state`.

## Protocol sketch (v1)

Client → server:
- `join { roomId, name }`
- `ready {}`
- `guess { countryId, clientTime }`

Server → clients:
- `lobby { players, settings }`
- `start { seed, countryIds, startsAt }`  — clients derive the order locally
  from the seed via `seededShuffle`
- `state { currentIndex, claims, scores, deadline }` — broadcast after every
  accepted event (idempotent full-state sync keeps reconnection trivial)
- `claimed { countryId, by, elapsedMs }`
- `finish { perCountryResults, totals }`

Timers are absolute deadlines (epoch ms), never client-side countdowns —
matching how the solo engine already works after the refactor.

## What the current codebase already provides

| Foundation | Where |
|---|---|
| Pure, serializable rules engine (no Map/Set/Date, no browser deps) | `lib/engine/` |
| Seeded, deterministic country order (server sends a seed, both clients derive the same race) | `lib/engine/rng.ts` |
| Wall-clock deadline timers (tick-proof, background-tab-proof) | `lib/engine/solo.ts` + `CountdownTimer` |
| Store as thin adapter — a server-state applier can replace the local reducer per mode | `lib/store/game-store.ts` (`apply()`) |
| Engine test harness (`pnpm test`) | `lib/engine/solo.test.ts` |
| Click → country validation isolated and index-accelerated | `components/globe/hooks/useCountryPicking.ts` |

## Next steps (in order)

1. `lib/engine/race.ts`: race state + reducers (claims, lockouts, deadlines)
   with tests — pure logic, no networking.
2. `server/`: Node WS server hosting rooms that drive `race.ts`; deploy to
   Railway.
3. Client: `race-store.ts` adapter (receives `state` broadcasts, sends
   intents), lobby/invite UI, opponent presence UI (their claims coloring the
   globe in their color, progress bar).
4. Reconnection (rejoin by roomId + player token, full-state resync).
5. Later: accounts, matchmaking, Elo, spectating.
