import { describe, it, expect } from "vitest";
import { generateShortCode } from "./lib/generate-code";


describe("generateShortCode", () => {
  it("returns the requested length", () => {
    expect(generateShortCode()).toHaveLength(7);
    expect(generateShortCode(5)).toHaveLength(5);
    expect(generateShortCode(32)).toHaveLength(32);
  });

  it("matches the database regex", () => {
    const regex = /^[A-Za-z0-9_-]{3,32}$/;
    for (let i = 0; i < 5000; i++) {
      expect(generateShortCode()).toMatch(regex);
    }
  });

  it("only uses base62 characters", () => {
    for (let i = 0; i < 1000; i++) {
      expect(generateShortCode(32)).toMatch(/^[A-Za-z0-9]+$/);
    }
  });

  it("generates 10,000 unique codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      codes.add(generateShortCode(7));
    }
    // Probabilistic: duplicate chance is ~1 in 70,000. The DB unique
    // constraint, not this test, is what guarantees uniqueness.
    expect(codes.size).toBe(10_000);
  });

  it("throws for invalid lengths", () => {
    for (const length of [0, 1, 2, 33, -1, 3.5, NaN]) {
      expect(() => generateShortCode(length)).toThrow("Invalid code length");
    }
  });
});