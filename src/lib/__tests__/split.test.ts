import { describe, expect, it } from "vitest";
import { MAX_AMOUNT_PAISE } from "../money";
import { computeShares, MAX_SHARES_PER_PERSON, SplitError, validateSplit } from "../split";
import type { SplitInput } from "../types";

const equalAmong = (...ids: string[]): SplitInput[] => ids.map((memberId) => ({ memberId, weight: 1 }));
const sum = (shares: Map<string, number>) => [...shares.values()].reduce((a, b) => a + b, 0);

describe("computeShares: equal", () => {
  it("splits an indivisible amount with largest remainder (₹100 across 3)", () => {
    const shares = computeShares({ amountPaise: 10000, mode: "equal", splits: equalAmong("a", "b", "c") });
    expect([...shares.values()]).toEqual([3334, 3333, 3333]);
    expect(sum(shares)).toBe(10000);
  });

  it("gives the extra paise to the lowest memberIds when several are left over", () => {
    const shares = computeShares({ amountPaise: 10, mode: "equal", splits: equalAmong("a", "b", "c", "d", "e", "f") });
    expect([...shares.values()]).toEqual([2, 2, 2, 2, 1, 1]);
  });

  it("breaks ties by memberId, not by the order the splits arrive in", () => {
    const forward = computeShares({ amountPaise: 10000, mode: "equal", splits: equalAmong("a", "b", "c") });
    const backward = computeShares({ amountPaise: 10000, mode: "equal", splits: equalAmong("c", "b", "a") });
    expect(backward.get("a")).toBe(3334); // the lowest id gets the spare paisa either way
    expect(backward.get("b")).toBe(3333);
    expect(backward.get("c")).toBe(3333);
    expect(Object.fromEntries(backward)).toEqual(Object.fromEntries(forward));
  });

  it("ignores stored weights in equal mode", () => {
    const shares = computeShares({
      amountPaise: 900,
      mode: "equal",
      splits: [
        { memberId: "a", weight: 7 },
        { memberId: "b", weight: 1 },
      ],
    });
    expect([...shares.values()]).toEqual([450, 450]);
  });

  it("charges only the included members (partial group: 4 of 11)", () => {
    const everyone = Array.from({ length: 11 }, (_, i) => `m${i}`);
    const goers = everyone.slice(0, 4);
    const shares = computeShares({ amountPaise: 420000, mode: "equal", splits: equalAmong(...goers) });
    expect(shares.size).toBe(4);
    expect([...shares.values()]).toEqual([105000, 105000, 105000, 105000]);
    for (const stayedBack of everyone.slice(4)) expect(shares.get(stayedBack) ?? 0).toBe(0);
  });
});

describe("computeShares: shares", () => {
  it("splits 2:1:1 proportionally", () => {
    const shares = computeShares({
      amountPaise: 10000,
      mode: "shares",
      splits: [
        { memberId: "a", weight: 2 },
        { memberId: "b", weight: 1 },
        { memberId: "c", weight: 1 },
      ],
    });
    expect([...shares]).toEqual([
      ["a", 5000],
      ["b", 2500],
      ["c", 2500],
    ]);
  });

  it("stays exact when proportions do not divide evenly", () => {
    const shares = computeShares({
      amountPaise: 418000,
      mode: "shares",
      splits: [
        { memberId: "a", weight: 2 },
        { memberId: "b", weight: 1 },
        { memberId: "c", weight: 2 },
        { memberId: "d", weight: 1 },
        { memberId: "e", weight: 1 },
      ],
    });
    expect(sum(shares)).toBe(418000);
    expect(shares.get("a")).toBe(shares.get("c"));
  });

  it("breaks shares ties by memberId in any input order", () => {
    // 100 paise over 3 equal shares leaves one spare paisa; every ordering must hand it to "a".
    const members = ["a", "b", "c"];
    for (const order of [members, [...members].reverse(), ["b", "c", "a"]]) {
      const shares = computeShares({
        amountPaise: 100,
        mode: "shares",
        splits: order.map((memberId) => ({ memberId, weight: 2 })),
      });
      expect(Object.fromEntries(shares), order.join()).toEqual({ a: 34, b: 33, c: 33 });
    }
  });

  it("gives a zero-weight member nothing", () => {
    const shares = computeShares({
      amountPaise: 101,
      mode: "shares",
      splits: [
        { memberId: "a", weight: 1 },
        { memberId: "b", weight: 0 },
        { memberId: "c", weight: 1 },
      ],
    });
    expect([...shares]).toEqual([
      ["a", 51],
      ["b", 0],
      ["c", 50],
    ]);
  });
});

describe("computeShares: exact", () => {
  it("returns the stated amounts when they add up", () => {
    const shares = computeShares({
      amountPaise: 1000,
      mode: "exact",
      splits: [
        { memberId: "a", weight: 600 },
        { memberId: "b", weight: 400 },
      ],
    });
    expect([...shares]).toEqual([
      ["a", 600],
      ["b", 400],
    ]);
  });

  it("throws a typed error when the amounts do not add up", () => {
    const request = {
      amountPaise: 1000,
      mode: "exact" as const,
      splits: [
        { memberId: "a", weight: 600 },
        { memberId: "b", weight: 300 },
      ],
    };
    expect(() => computeShares(request)).toThrow(SplitError);
    expect(() => computeShares(request)).toThrow("₹1 left to assign");
  });
});

describe("validateSplit", () => {
  it("accepts a good split", () => {
    expect(validateSplit({ amountPaise: 100, mode: "equal", splits: equalAmong("a") })).toBeNull();
  });

  it("explains exact mismatches in both directions", () => {
    const base = { amountPaise: 10000, mode: "exact" as const };
    expect(validateSplit({ ...base, splits: [{ memberId: "a", weight: 9000 }] })).toBe("₹10 left to assign");
    expect(validateSplit({ ...base, splits: [{ memberId: "a", weight: 10550 }] })).toBe("Amounts are ₹5.50 over the total");
  });

  it("rejects empty splits, zero total shares, negatives and duplicates", () => {
    expect(validateSplit({ amountPaise: 100, mode: "equal", splits: [] })).toMatch(/at least one person/);
    expect(validateSplit({ amountPaise: 100, mode: "shares", splits: [{ memberId: "a", weight: 0 }] })).toMatch(/share/);
    expect(validateSplit({ amountPaise: 100, mode: "shares", splits: [{ memberId: "a", weight: -1 }] })).toMatch(/negative/);
    expect(validateSplit({ amountPaise: 100, mode: "equal", splits: equalAmong("a", "a") })).toMatch(/only appear once/);
  });

  it("rejects non-positive, fractional and oversized amounts", () => {
    for (const amountPaise of [0, -5, 10.5, Number.NaN, 2_000_000_001]) {
      expect(validateSplit({ amountPaise, mode: "equal", splits: equalAmong("a") }), String(amountPaise)).not.toBeNull();
    }
  });

  it("rejects unknown split modes", () => {
    for (const mode of ["foo", "", "EQUAL", undefined, 3]) {
      const problem = validateSplit({ amountPaise: 100, mode: mode as never, splits: equalAmong("a") });
      expect(problem, String(mode)).toMatch(/how to split/);
    }
  });

  it("rejects any weight above the maximum amount, whatever the mode", () => {
    const huge = [{ memberId: "a", weight: MAX_AMOUNT_PAISE + 1 }];
    expect(validateSplit({ amountPaise: 100, mode: "exact", splits: huge })).toMatch(/at most/);
    expect(validateSplit({ amountPaise: 100, mode: "equal", splits: huge })).toMatch(/at most/);
    expect(validateSplit({ amountPaise: 100, mode: "shares", splits: [{ memberId: "a", weight: 3_000_000_000 }] })).not.toBeNull();
  });

  it("caps shares at 1000 per person with a friendly message", () => {
    const withShares = (weight: number) => [{ memberId: "a", weight }, { memberId: "b", weight: 1 }];
    expect(validateSplit({ amountPaise: 100, mode: "shares", splits: withShares(MAX_SHARES_PER_PERSON) })).toBeNull();
    expect(validateSplit({ amountPaise: 100, mode: "shares", splits: withShares(MAX_SHARES_PER_PERSON + 1) })).toBe(
      "Shares can be at most 1000 per person",
    );
  });

  it("rejects non-integer weights", () => {
    expect(validateSplit({ amountPaise: 100, mode: "shares", splits: [{ memberId: "a", weight: 1.5 }] })).toMatch(/negative/);
    expect(validateSplit({ amountPaise: 100, mode: "shares", splits: [{ memberId: "a", weight: Number.NaN }] })).not.toBeNull();
  });

  it("makes computeShares throw SplitError for zero total weight and empty splits", () => {
    expect(() => computeShares({ amountPaise: 100, mode: "shares", splits: [{ memberId: "a", weight: 0 }] })).toThrow(SplitError);
    expect(() => computeShares({ amountPaise: 100, mode: "equal", splits: [] })).toThrow(SplitError);
  });
});
