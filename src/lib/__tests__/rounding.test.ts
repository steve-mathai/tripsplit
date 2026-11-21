import { describe, expect, it } from "vitest";
import { roundingDriftPaise, roundToRupees } from "../rounding";
import { planSettlement } from "../settle-plan";

/** mulberry32: tiny seeded PRNG so failures are reproducible. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const nets = (entries: Record<string, number>) => Object.entries(entries).map(([memberId, net]) => ({ memberId, net }));
const byId = (list: { memberId: string; net: number }[]) => Object.fromEntries(list.map((b) => [b.memberId, b.net]));

describe("roundToRupees", () => {
  it("hands the leftover rupee to the largest remainder", () => {
    // 10.60 + 20.30 - 30.90 = 0. Floors: 10, 20, -31; one leftover rupee goes to a (remainder 60).
    const rounded = roundToRupees(nets({ a: 1060, b: 2030, c: -3090 }));
    expect(byId(rounded)).toEqual({ a: 1100, b: 2000, c: -3100 });
  });

  it("leaves whole-rupee balances alone", () => {
    const input = nets({ a: 5000, b: -2000, c: -3000 });
    expect(roundToRupees(input)).toEqual(input);
  });

  it("breaks equal remainders by member id, not by position", () => {
    // Both remainders are 50, so one of them must round up: the lower id, whichever comes first in the list.
    const forward = roundToRupees(nets({ a: 150, b: 150, c: -300 }));
    const backward = roundToRupees(nets({ c: -300, b: 150, a: 150 }));
    expect(byId(forward)).toEqual(byId(backward));
    expect(byId(forward)).toEqual({ a: 200, b: 100, c: -300 });
  });

  it("rounds negative balances toward the rupee below, never to -0", () => {
    const rounded = roundToRupees(nets({ a: -40, b: 40 }));
    expect(byId(rounded)).toEqual({ a: 0, b: 0 });
    expect(rounded.every((b) => Object.is(b.net, 0))).toBe(true);
  });

  it("rejects balances that do not sum to zero or are not whole paise", () => {
    expect(() => roundToRupees(nets({ a: 100, b: -50 }))).toThrow(/sum to zero/);
    expect(() => roundToRupees([{ memberId: "a", net: 0.5 }, { memberId: "b", net: -0.5 }])).toThrow(/whole paise/);
  });

  it("reports drift as the paise moved", () => {
    const before = nets({ a: 1060, b: 2030, c: -3090 });
    expect(roundingDriftPaise(before, roundToRupees(before))).toBe(40 + 30 + 10);
  });

  it("property: sums to zero, each error under one rupee, whole rupees, same for any input order", () => {
    const random = seededRandom(20261121);
    for (let round = 0; round < 500; round++) {
      const size = 2 + Math.floor(random() * 11);
      const values = Array.from({ length: size - 1 }, () => Math.round((random() - 0.5) * 2_000_000));
      values.push(-values.reduce((a, b) => a + b, 0));
      const input = values.map((net, i) => ({ memberId: `m${String(i).padStart(2, "0")}`, net }));
      const label = `round ${round}: ${JSON.stringify(values)}`;

      const rounded = roundToRupees(input);
      expect(rounded.reduce((t, b) => t + b.net, 0), label).toBe(0);
      rounded.forEach((b, i) => {
        expect(b.net % 100, label).toBe(0);
        expect(Math.abs(b.net - input[i].net), label).toBeLessThan(100);
      });

      const shuffled = [...input].sort(() => random() - 0.5);
      expect(byId(roundToRupees(shuffled)), label).toEqual(byId(rounded));
    }
  });
});

describe("planSettlement", () => {
  const balances = nets({ a: 6772, b: 3050, c: -4310, d: -5512 });

  it("with rounding off returns the true balances and no drift", () => {
    const plan = planSettlement(balances, false);
    expect(plan.nets).toEqual(balances);
    expect(plan.driftPaise).toBe(0);
    expect(plan.transfers.reduce((t, x) => t + x.amountPaise, 0)).toBe(6772 + 3050);
  });

  it("with rounding on every transfer is a whole number of rupees and drift is reported", () => {
    const plan = planSettlement(balances, true);
    expect(plan.transfers.length).toBeGreaterThan(0);
    expect(plan.transfers.every((t) => t.amountPaise % 100 === 0)).toBe(true);
    expect(plan.driftPaise).toBe(roundingDriftPaise(balances, plan.nets));
    expect(plan.driftPaise).toBeGreaterThan(0);
  });

  it("property: rounded plans always settle their own rounded balances to zero in whole rupees", () => {
    const random = seededRandom(7);
    for (let round = 0; round < 300; round++) {
      const size = 2 + Math.floor(random() * 9);
      const values = Array.from({ length: size - 1 }, () => Math.round((random() - 0.5) * 500_000));
      values.push(-values.reduce((a, b) => a + b, 0));
      const input = values.map((net, i) => ({ memberId: `m${i}`, net }));
      const plan = planSettlement(input, true);
      const left = byId(plan.nets);
      for (const t of plan.transfers) {
        expect(t.amountPaise % 100).toBe(0);
        left[t.from] += t.amountPaise;
        left[t.to] -= t.amountPaise;
      }
      expect(Object.values(left).every((v) => v === 0), `round ${round}`).toBe(true);
    }
  });
});
