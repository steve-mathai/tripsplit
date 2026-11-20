import { describe, expect, it } from "vitest";
import { hueOf } from "../../components/person-tint";
import { MEMBER_COLORS } from "../types";

const hues = MEMBER_COLORS.map(hueOf);

// Shortest way round the colour wheel, 0-180.
function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
}

describe("MEMBER_COLORS", () => {
  it("has 12 distinct, well-formed colours", () => {
    expect(MEMBER_COLORS).toHaveLength(12);
    expect(new Set(MEMBER_COLORS).size).toBe(12);
    for (const color of MEMBER_COLORS) expect(color).toMatch(/^#[0-9a-f]{6}$/);
    expect(new Set(hues).size).toBe(12);
  });

  it("uses no violet or indigo hue (245 to 300 degrees)", () => {
    for (const hue of hues) expect(hue < 245 || hue > 300, `hue ${hue}`).toBe(true);
  });

  it("keeps neighbours at least 60 degrees apart, including the wrap from last to first", () => {
    hues.forEach((hue, index) => {
      const next = hues[(index + 1) % hues.length];
      expect(hueDistance(hue, next), `${hue} next to ${next}`).toBeGreaterThanOrEqual(60);
    });
  });
});
