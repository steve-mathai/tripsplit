import { describe, expect, it } from "vitest";
import { SLUG_ALPHABET, randomSuffix, slugFromName } from "../slug";

describe("slugFromName", () => {
  it("keeps a readable stem and a 16 character suffix from the alphabet", () => {
    for (let i = 0; i < 2000; i++) {
      expect(slugFromName("Goa Trip!")).toMatch(/^goa-trip-[a-hj-km-np-z2-9]{16}$/);
    }
  });

  it("truncates long stems to 20 characters and falls back to 'trip' for punctuation", () => {
    expect(slugFromName("A very long trip name that goes on and on")).toMatch(/^a-very-long-trip-nam-[a-z2-9]{16}$/);
    expect(slugFromName("!!!")).toMatch(/^trip-[a-z2-9]{16}$/);
  });

  it("is unique over many draws", () => {
    const seen = new Set(Array.from({ length: 10_000 }, () => slugFromName("goa")));
    expect(seen.size).toBe(10_000);
  });
});

describe("randomSuffix", () => {
  it("has 31 letters, so 16 of them carry about 79 bits", () => {
    expect(SLUG_ALPHABET).toHaveLength(31);
    expect(16 * Math.log2(SLUG_ALPHABET.length)).toBeGreaterThan(79);
  });

  it("discards biased bytes instead of using a modulo", () => {
    // 248 = 8 * 31. Bytes 248..255 would map to the first 8 letters under `% 31`; they must be skipped.
    const bytes = [255, 248, 0, 247, ...Array<number>(40).fill(31)];
    const fill = (target: Uint8Array) => {
      target.set(bytes.slice(0, target.length));
      return target;
    };
    expect(randomSuffix(3, fill)).toBe(`${SLUG_ALPHABET[0]}${SLUG_ALPHABET[247 % 31]}${SLUG_ALPHABET[0]}`);
  });

  it("uses every letter about equally often", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 6000; i++) for (const ch of randomSuffix()) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    const expected = (6000 * 16) / 31;
    expect(counts.size).toBe(31);
    for (const n of counts.values()) expect(Math.abs(n - expected) / expected).toBeLessThan(0.1);
  });
});
