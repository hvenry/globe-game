import { describe, expect, it } from "vitest";
import { ROOM_CODE_LENGTH, isRoomCode, normalizeRoomCode } from "./room-code";

describe("normalizeRoomCode", () => {
  it("upper-cases a bare code", () => {
    expect(normalizeRoomCode("9azrvv")).toBe("9AZRVV");
  });

  it("extracts the code from a pasted invite link", () => {
    expect(normalizeRoomCode("http://localhost:3000/race?room=9AZRVV")).toBe("9AZRVV");
    expect(normalizeRoomCode("https://globe.expert/race?room=9azrvv#x")).toBe("9AZRVV");
  });

  it("does not turn the scheme of a link into a code", () => {
    expect(normalizeRoomCode("http://localhost:3000/race?room=")).toBe("");
  });

  it("maps lookalike letters onto the alphabet", () => {
    expect(normalizeRoomCode("O1IL")).toBe("0111");
  });

  it("drops characters that cannot be in a code", () => {
    expect(normalizeRoomCode("9A-ZR VV!")).toBe("9AZRVV");
    expect(normalizeRoomCode("UUU")).toBe("");
  });

  it("never exceeds the code length", () => {
    expect(normalizeRoomCode("9AZRVV9AZRVV")).toHaveLength(ROOM_CODE_LENGTH);
  });
});

describe("isRoomCode", () => {
  it("accepts only full codes from the alphabet", () => {
    expect(isRoomCode("9AZRVV")).toBe(true);
    expect(isRoomCode("HTTPLO")).toBe(false);
    expect(isRoomCode("9AZRV")).toBe(false);
  });
});
