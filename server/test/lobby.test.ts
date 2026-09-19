import { describe, expect, test } from "vitest";

import {
  LOBBY_LIMITS,
  canStart,
  configure,
  createLobby,
  defaultRaceConfig,
  join,
  kick,
  leave,
  markStarted,
  reopen,
  sanitizeName,
  setColor,
  setReady,
  toRacePlayers,
  type LobbyState,
} from "../src/lobby";

import { PLAYER_COLOR_IDS } from "../../lib/constants";

const base = () => createLobby("ABC123", defaultRaceConfig(), 1_000);

/** Seat n ready, connected players, opening enough seats for them first. */
function roomOf(count: number): LobbyState {
  let lobby = base();
  for (let i = 0; i < count; i++) {
    lobby = join(lobby, `p${i}`, `Player ${i}`);
    if (i === 0 && count > LOBBY_LIMITS.defaultPlayers) {
      lobby = configure(lobby, "p0", { maxPlayers: count });
    }
    lobby = setReady(lobby, `p${i}`, true);
  }
  return lobby;
}

describe("sanitizeName", () => {
  test("collapses whitespace and trims", () => {
    expect(sanitizeName("  Ada   Lovelace  ")).toBe("Ada Lovelace");
  });

  test("caps length so one player cannot blow out the roster UI", () => {
    const name = sanitizeName("x".repeat(100));
    expect(name).toHaveLength(LOBBY_LIMITS.maxNameLength);
  });

  test("falls back when a name is empty or only whitespace", () => {
    expect(sanitizeName("   ")).toBe("Player");
    expect(sanitizeName("", "Guest")).toBe("Guest");
  });

  test("falls back when a name is shorter than the minimum", () => {
    expect(sanitizeName("A")).toBe("Player");
    expect(sanitizeName(" x ")).toBe("Player");
    expect(sanitizeName("Al")).toBe("Al");
  });
});

describe("join", () => {
  test("the first player to arrive becomes host", () => {
    const lobby = join(base(), "p0", "Ada");
    expect(lobby.hostId).toBe("p0");
    expect(lobby.players).toHaveLength(1);
  });

  test("later players do not take the host role", () => {
    const lobby = join(join(base(), "p0", "Ada"), "p1", "Grace");
    expect(lobby.hostId).toBe("p0");
  });

  test("a known id reclaims its seat and keeps its ready flag", () => {
    let lobby = join(base(), "p0", "Ada");
    lobby = setReady(lobby, "p0", true);
    lobby = leave(lobby, "p0");
    expect(lobby.players[0].connected).toBe(false);

    lobby = join(lobby, "p0", "Ada");
    expect(lobby.players).toHaveLength(1);
    expect(lobby.players[0].connected).toBe(true);
  });

  test("a full room returns the same state, so callers can detect the no-op", () => {
    let lobby = base();
    for (let i = 0; i < LOBBY_LIMITS.defaultPlayers; i++) {
      lobby = join(lobby, `p${i}`, `P${i}`);
    }
    expect(join(lobby, "late", "Late")).toBe(lobby);
  });

  test("nobody new joins once the race has started", () => {
    const lobby = markStarted(join(base(), "p0", "Ada"));
    expect(join(lobby, "p1", "Grace")).toBe(lobby);
  });

  test("but a player already in the race can still reconnect", () => {
    let lobby = join(base(), "p0", "Ada");
    lobby = markStarted(leave(lobby, "p0"));
    expect(join(lobby, "p0", "Ada").players[0].connected).toBe(true);
  });
});

describe("leave", () => {
  test("keeps the seat so a reload can reclaim it", () => {
    const lobby = leave(join(base(), "p0", "Ada"), "p0");
    expect(lobby.players).toHaveLength(1);
    expect(lobby.players[0].connected).toBe(false);
  });

  test("clears ready, so a stale flag cannot start a race", () => {
    let lobby = setReady(join(base(), "p0", "Ada"), "p0", true);
    lobby = leave(lobby, "p0");
    expect(lobby.players[0].ready).toBe(false);
  });

  test("hands the host role to the next connected player", () => {
    let lobby = join(join(base(), "p0", "Ada"), "p1", "Grace");
    lobby = leave(lobby, "p0");
    expect(lobby.hostId).toBe("p1");
  });

  test("host becomes null when the room empties, and returns on rejoin", () => {
    let lobby = leave(join(base(), "p0", "Ada"), "p0");
    expect(lobby.hostId).toBeNull();
    lobby = join(lobby, "p0", "Ada");
    expect(lobby.hostId).toBe("p0");
  });

  test("unknown and already-departed players are no-ops", () => {
    const lobby = leave(join(base(), "p0", "Ada"), "p0");
    expect(leave(lobby, "p0")).toBe(lobby);
    expect(leave(lobby, "nobody")).toBe(lobby);
  });
});

describe("setReady", () => {
  test("an unchanged flag is a no-op", () => {
    const lobby = join(base(), "p0", "Ada");
    expect(setReady(lobby, "p0", false)).toBe(lobby);
  });

  test("a disconnected player cannot ready up", () => {
    const lobby = leave(join(base(), "p0", "Ada"), "p0");
    expect(setReady(lobby, "p0", true)).toBe(lobby);
  });
});

describe("configure", () => {
  test("only the host can change settings", () => {
    const lobby = join(join(base(), "p0", "Ada"), "p1", "Grace");
    expect(configure(lobby, "p1", { countrySetId: "europe" })).toBe(lobby);
    expect(configure(lobby, "p0", { countrySetId: "europe" }).config.countrySetId).toBe("europe");
  });

  test("country count is held inside its range", () => {
    const lobby = join(base(), "p0", "Ada");
    expect(configure(lobby, "p0", { countryCount: 1 })).toBe(lobby);
    expect(configure(lobby, "p0", { countryCount: 9999 })).toBe(lobby);
    expect(configure(lobby, "p0", { countryCount: 30 }).config.countryCount).toBe(30);
  });

  test("settings freeze once the race starts", () => {
    const lobby = markStarted(join(base(), "p0", "Ada"));
    expect(configure(lobby, "p0", { countrySetId: "asia" })).toBe(lobby);
  });

  test("hints are a room setting, host only, off by default", () => {
    const lobby = join(join(base(), "p0", "Ada"), "p1", "Grace");
    expect(lobby.config.showHints).toBe(false);
    expect(configure(lobby, "p1", { showHints: true })).toBe(lobby);
    expect(configure(lobby, "p0", { showHints: true }).config.showHints).toBe(true);
  });

  test("the window per country is one of the offered lengths, default ten seconds", () => {
    const lobby = join(join(base(), "p0", "Ada"), "p1", "Grace");
    expect(lobby.config.countryWindowMs).toBe(10_000);
    expect(configure(lobby, "p0", { countryWindowSec: 30 }).config.countryWindowMs).toBe(30_000);
    expect(configure(lobby, "p0", { countryWindowSec: 7 })).toBe(lobby);
    expect(configure(lobby, "p1", { countryWindowSec: 30 })).toBe(lobby);
  });

  test("host sets the number of seats within the room's range", () => {
    const lobby = join(base(), "p0", "Ada");
    expect(lobby.maxPlayers).toBe(LOBBY_LIMITS.defaultPlayers);
    expect(configure(lobby, "p0", { maxPlayers: 4 }).maxPlayers).toBe(4);
    expect(configure(lobby, "p0", { maxPlayers: 1 })).toBe(lobby);
    expect(configure(lobby, "p0", { maxPlayers: LOBBY_LIMITS.maxPlayers + 1 })).toBe(lobby);
  });

  test("seats cannot shrink below the players already present", () => {
    let lobby = configure(join(base(), "p0", "Ada"), "p0", { maxPlayers: 4 });
    lobby = join(join(lobby, "p1", "Grace"), "p2", "Mary");
    expect(configure(lobby, "p0", { maxPlayers: 2 })).toBe(lobby);
    expect(configure(lobby, "p0", { maxPlayers: 3 }).maxPlayers).toBe(3);
  });

  test("a full room turns new players away, by the host's count not the cap", () => {
    const lobby = configure(join(join(base(), "p0", "Ada"), "p1", "Grace"), "p0", { maxPlayers: 3 });
    expect(join(lobby, "p2", "Mary").players).toHaveLength(3);
    expect(join(lobby, "p3", "Late")).not.toBe(lobby);
    const full = join(lobby, "p2", "Mary");
    expect(join(full, "p3", "Late")).toBe(full);
  });
});

describe("kick", () => {
  test("host removes a seat and that id cannot rejoin", () => {
    const lobby = join(join(base(), "p0", "Ada"), "p1", "Grace");
    const after = kick(lobby, "p0", "p1");
    expect(after.players.map((p) => p.id)).toEqual(["p0"]);
    expect(join(after, "p1", "Grace")).toBe(after);
    expect(join(after, "p2", "Mary").players).toHaveLength(2);
  });

  test("only the host kicks, and never themselves", () => {
    const lobby = join(join(base(), "p0", "Ada"), "p1", "Grace");
    expect(kick(lobby, "p1", "p0")).toBe(lobby);
    expect(kick(lobby, "p0", "p0")).toBe(lobby);
    expect(kick(lobby, "p0", "nobody")).toBe(lobby);
  });

  test("a kicked seat frees its colour", () => {
    const lobby = join(join(base(), "p0", "Ada"), "p1", "Grace");
    const freed = lobby.players[1].color;
    const after = join(kick(lobby, "p0", "p1"), "p2", "Mary", freed);
    expect(after.players[1].color).toBe(freed);
  });
});

describe("canStart", () => {
  test("needs at least the minimum number of players", () => {
    expect(canStart(roomOf(LOBBY_LIMITS.minPlayers - 1))).toBe(false);
    expect(canStart(roomOf(LOBBY_LIMITS.minPlayers))).toBe(true);
  });

  test("every connected player has to be ready", () => {
    const lobby = setReady(roomOf(2), "p1", false);
    expect(canStart(lobby)).toBe(false);
  });

  test("a disconnected player does not hold the room hostage", () => {
    let lobby = roomOf(3);
    lobby = leave(lobby, "p2");
    expect(canStart(lobby)).toBe(true);
  });

  test("an already-started race cannot start again", () => {
    expect(canStart(markStarted(roomOf(2)))).toBe(false);
  });
});

describe("toRacePlayers", () => {
  test("deals in only the players who are present", () => {
    const lobby = leave(roomOf(3), "p1");
    expect(toRacePlayers(lobby).map((p) => p.id)).toEqual(["p0", "p2"]);
  });

  test("carries the sanitized name through to the race", () => {
    const lobby = join(base(), "p0", "   Ada   Lovelace   ");
    expect(toRacePlayers(lobby)[0].name).toBe("Ada Lovelace");
  });
});

describe("identity colours", () => {
  test("each new seat takes the first colour nobody holds", () => {
    const lobby = roomOf(3);
    expect(lobby.players.map((p) => p.color)).toEqual([
      PLAYER_COLOR_IDS[0],
      PLAYER_COLOR_IDS[1],
      PLAYER_COLOR_IDS[2],
    ]);
  });

  test("a requested colour is honoured when free", () => {
    const lobby = join(base(), "p0", "Ada", "orange");
    expect(lobby.players[0].color).toBe("orange");
  });

  test("a requested colour already in the room is passed over", () => {
    let lobby = join(base(), "p0", "Ada", "orange");
    lobby = join(lobby, "p1", "Bo", "orange");
    expect(lobby.players[1].color).not.toBe("orange");
    expect(lobby.players[1].color).toBe(PLAYER_COLOR_IDS[0]);
  });

  test("a full room has one seat per colour, all distinct", () => {
    const lobby = roomOf(LOBBY_LIMITS.maxPlayers);
    expect(LOBBY_LIMITS.maxPlayers).toBe(PLAYER_COLOR_IDS.length);
    expect(new Set(lobby.players.map((p) => p.color)).size).toBe(
      LOBBY_LIMITS.maxPlayers,
    );
  });

  test("setColor claims a free colour", () => {
    const lobby = setColor(roomOf(1), "p0", "cyan");
    expect(lobby.players[0].color).toBe("cyan");
  });

  test("setColor refuses one another seat holds, leaving the state untouched", () => {
    const lobby = roomOf(2);
    expect(setColor(lobby, "p1", lobby.players[0].color)).toBe(lobby);
  });

  test("setColor is a no-op for an unknown player and for the colour already held", () => {
    const lobby = roomOf(1);
    expect(setColor(lobby, "nobody", "cyan")).toBe(lobby);
    expect(setColor(lobby, "p0", lobby.players[0].color)).toBe(lobby);
  });

  test("the race roster carries each player's colour", () => {
    const lobby = roomOf(2);
    expect(toRacePlayers(lobby).map((p) => p.color)).toEqual([
      lobby.players[0].color,
      lobby.players[1].color,
    ]);
  });
});

describe("reopen", () => {
  test("clears started and every ready flag, keeping seats and settings", () => {
    const lobby = markStarted(configure(roomOf(2), "p0", { countrySetId: "asia" }));
    const again = reopen(lobby);
    expect(again.started).toBe(false);
    expect(again.players.map((p) => p.ready)).toEqual([false, false]);
    expect(again.players.map((p) => p.id)).toEqual(["p0", "p1"]);
    expect(again.hostId).toBe("p0");
    expect(again.config.countrySetId).toBe("asia");
    expect(canStart(again)).toBe(false);
  });

  test("is a no-op for a room that has not started", () => {
    const lobby = roomOf(2);
    expect(reopen(lobby)).toBe(lobby);
  });
});
