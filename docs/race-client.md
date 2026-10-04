# Race Client

The browser side of race mode: a socket transport, a Zustand adapter store and the `components/race/` UI on the shared globe.

## Why
The client must feel instant while never deciding an outcome.
It renders whatever the server last broadcast, forwards intents, and hides latency only where the server will almost certainly agree.

## How it works
- **Transport** (`lib/race/client.ts`): owns the socket and nothing else; reconnects with backoff from 0.5s up to 8s.
  A resumed socket catches up from the first broadcast it receives, since the server sends whole state.
- **Server URL** (`lib/race/config.ts`): `NEXT_PUBLIC_RACE_SERVER_URL`, defaulting to `http://localhost:8787`, so `pnpm dev` + `pnpm race:dev` works with no env.
- **Session** (`lib/race/session.ts`): the `playerId` from `welcome` is stored in `sessionStorage`, keyed by room, and sent back on `join` to reclaim the seat.
- **Store** (`lib/store/race-store.ts`): holds the last `lobby`/`state`/`finished` broadcast and a `status` (`idle`, `connecting`, `lobby`, `racing`, `left`, `finished`, `error`).
  Keeps `clockOffset` from each `serverNow` for timers.
- **Optimistic own claim:** clicking the live country paints it as yours at once (`pendingClaim`).
  The next broadcast settles it either way; if the server ignores the click, the paint lapses after 1.5s.
- **UI flow** (`components/race/`): `RaceRoute` renders `GameContainer` already in race mode, so every mode shares one globe canvas.
  `RaceMode` switches on store status: `JoinView` → `LobbyView` → `RaceHud` (with `RaceFeed`) → `RaceResults`, and feeds race props into the globe.
- **Invite link:** `/race?room=CODE` opens the join form with the code filled in; creating a room rewrites the URL to it.

## Tech
- Browser WebSocket, Zustand, React Three Fiber (shared globe)

## Key files
- `lib/race/client.ts` - `RaceClient` socket transport and `createRoom`
- `lib/race/config.ts` - server URL and socket URL
- `lib/race/session.ts` - per-room `playerId` credential
- `lib/race/room-code.ts` - room code alphabet and validation (shared with the server)
- `lib/store/race-store.ts` - client adapter store
- `components/race/RaceRoute.tsx` - `/race` entry, reads the invite code
- `components/race/RaceMode.tsx` - picks the race view and bridges the store to the globe
- `components/race/LobbyView.tsx`, `RaceHud.tsx`, `RaceFeed.tsx`, `RaceResults.tsx` - lobby, HUD, feed, results

## Decisions and gotchas
- `sessionStorage`, not `localStorage`: a second tab is a second player, so two people can test on one machine; a reload keeps the seat.
- Keying the credential by room means an id minted for one room is never offered to another.
- The store mirrors `game-store`'s relationship to the solo engine, but never runs rules itself; every outcome is the server's call.
- Race UI is consumed through per-field selectors like every other store.

## Related
- [Race mode](race-mode.md)
- [Race protocol](race-protocol.md)
- [Race server](race-server.md)
- [State stores](state-stores.md)
- [Globe rendering](globe-rendering.md)
