import { describe, expect, test } from "vitest";
import { countryNameTier, formatClock } from "./utils";

describe("countryNameTier", () => {
  test("short names keep the full type scale", () => {
    expect(countryNameTier("Chad")).toBe("short");
    expect(countryNameTier("Peru")).toBe("short");
    // 14 characters — the last length before stepping down
    expect(countryNameTier("United Kingdom")).toBe("short");
  });

  test("mid-length names step down once", () => {
    expect(countryNameTier("Papua New Guinea")).toBe("medium");
    expect(countryNameTier("Equatorial Guinea")).toBe("medium");
    // 21 characters — the last length before the smallest tier
    expect(countryNameTier("Saint Kitts and Nevis")).toBe("medium");
  });

  test("the long tail steps down twice", () => {
    expect(countryNameTier("Central African Republic")).toBe("long");
    expect(countryNameTier("Democratic Republic of the Congo")).toBe("long");
    expect(countryNameTier("Saint Vincent and the Grenadines")).toBe("long");
  });

  test("is driven purely by length, so it needs no country data", () => {
    expect(countryNameTier("x".repeat(14))).toBe("short");
    expect(countryNameTier("x".repeat(15))).toBe("medium");
    expect(countryNameTier("x".repeat(21))).toBe("medium");
    expect(countryNameTier("x".repeat(22))).toBe("long");
  });
});

describe("formatClock", () => {
  test("shows minutes, seconds and milliseconds", () => {
    expect(formatClock(0)).toBe("0:00.000");
    expect(formatClock(5_007)).toBe("0:05.007");
    expect(formatClock(83_456)).toBe("1:23.456");
  });

  test("adds hours past the hour", () => {
    expect(formatClock(3_723_004)).toBe("1:02:03.004");
  });

  test("floors partial milliseconds and never goes negative", () => {
    expect(formatClock(1_999.9)).toBe("0:01.999");
    expect(formatClock(-250)).toBe("0:00.000");
  });
});
