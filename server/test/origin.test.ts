import { describe, expect, test } from "vitest";
import { isAllowedOrigin, parseAllowlist } from "../src/origin";

const PROD = parseAllowlist("https://globe.expert,https://www.globe.expert");

describe("isAllowedOrigin", () => {
  test("accepts anything on the explicit allowlist", () => {
    expect(isAllowedOrigin("https://globe.expert", PROD)).toBe(true);
    expect(isAllowedOrigin("https://www.globe.expert", PROD)).toBe(true);
  });

  test("rejects a foreign site, which is the whole point", () => {
    expect(isAllowedOrigin("https://evil.example", PROD)).toBe(false);
    expect(isAllowedOrigin("https://globe.expert.evil.example", PROD)).toBe(false);
    expect(isAllowedOrigin("http://notglobe.expert", PROD)).toBe(false);
  });

  test("accepts every shape a local dev browser sends", () => {
    for (const origin of [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://[::1]:3000",
      "http://192.168.2.65:3000",
      "http://10.0.0.5:3000",
      "http://172.16.4.2:3000",
      "http://globe.local:3000",
    ]) {
      expect(isAllowedOrigin(origin, PROD), origin).toBe(true);
    }
  });

  test("a public address that merely looks private is still rejected", () => {
    expect(isAllowedOrigin("http://172.32.0.1:3000", PROD)).toBe(false);
    expect(isAllowedOrigin("http://11.0.0.1:3000", PROD)).toBe(false);
    expect(isAllowedOrigin("http://192.169.0.1:3000", PROD)).toBe(false);
  });

  test("a hostname that merely ends in digits is not an IP", () => {
    expect(isAllowedOrigin("http://10.evil.example", PROD)).toBe(false);
    expect(isAllowedOrigin("http://192.168.evil.example", PROD)).toBe(false);
  });

  test("an absent Origin is allowed: only browsers guarantee to send one", () => {
    expect(isAllowedOrigin(null, PROD)).toBe(true);
  });

  test("a malformed Origin is rejected rather than throwing", () => {
    expect(isAllowedOrigin("not a url", PROD)).toBe(false);
    expect(isAllowedOrigin("", PROD)).toBe(false);
  });
});

describe("parseAllowlist", () => {
  test("trims and drops empties so a trailing comma is harmless", () => {
    expect(parseAllowlist("https://a.com, https://b.com ,")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });
});
