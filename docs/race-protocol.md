# Race Protocol

The JSON WebSocket messages between the race client and a `RaceRoom`, discriminated on `t`.

## Why
Client and server are deployed separately (Vercel and Cloudflare), so the wire contract is the one thing both must agree on.
Keeping it in one shared type module means a protocol change fails type-check on both sides instead of at runtime.

## How it works

Client to server:

| Message | Notes |
|---|---|
| `join { name, color?, playerId? }` | First message on every connection. `playerId` reclaims a seat after a reload. |
| `ready { ready }` | |
| `color { color }` | A colour another seat holds is refused, never swapped. |
| `configure { countrySetId?, countryCount?, maxPlayers?, showHints?, countryWindowSec? }` | Host, lobby only. `maxPlayers` never drops below current players. |
| `kick { playerId }` | Host, lobby only. Removes the seat and closes its sockets. |
| `start {}` | Host. Requires `canStart`: 2+ connected players, all ready. |
| `guess { countryId }` | |
| `rematch {}` | Any player, after finish. |
| `end {}` | Host. Ends a running race. |
| `ping {}` | |

Server to client:

| Message | Notes |
|---|---|
| `welcome { playerId, roomId, serverNow }` | Once per connection. `playerId` is the reconnect credential. |
| `lobby { lobby, canStart, serverNow }` | Lobby state after every change. |
| `state { state, serverNow }` | `publicView` after every accepted event. |
| `finished { state, standings, serverNow }` | View with the full order. |
| `error { code, message }` | See error codes below. |
| `pong { serverNow }` | |

Error codes: `bad_message`, `no_such_room`, `not_joined`, `not_host`, `cannot_start`, `room_full`, `kicked`, `already_started`, `rate_limited`.

## Key files
- `lib/race/types.ts` - `ClientMessage`, `ServerMessage`, `ErrorCode`, `LobbyState` (shared by both sides)
- `server/src/protocol.ts` - encode and defensive decode
- `lib/store/race-store.ts` - client-side message handling

## Decisions and gotchas
- **Whole-state broadcast, not deltas.** The state is small, and reconnect becomes a no-op: a rejoining client gets the same message everyone else does.
- **`serverNow` on every timed message.** All deadlines are absolute epoch ms, so a client with a skewed clock corrects with `offset = serverNow - Date.now()` measured on receipt.
- **Defensive parsing.** Unreadable or malformed client frames are dropped, never thrown, so one bad client cannot crash a room.
- `state` never carries `order` or `seed`; only `finished` reveals the full order.
- `lib/race/types.ts` is bundled into the Worker, so it must use relative imports.

## Related
- [Race mode](race-mode.md)
- [Race server](race-server.md)
- [Race client](race-client.md)
