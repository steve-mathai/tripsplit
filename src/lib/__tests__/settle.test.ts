import { describe, expect, it } from "vitest";
import { greedyTransfers, MAX_EXACT_MEMBERS, minimumTransfers } from "../settle";
import type { Transfer } from "../types";

interface Net {
  memberId: string;
  net: number;
}

const nets = (entries: Record<string, number>): Net[] =>
  Object.entries(entries).map(([memberId, net]) => ({ memberId, net }));

/** Applies transfers to the starting nets and returns what is left per member. */
function residuals(start: Net[], transfers: Transfer[]): Map<string, number> {
  const left = new Map(start.map((b) => [b.memberId, b.net]));
  for (const t of transfers) {
    left.set(t.from, (left.get(t.from) ?? 0) + t.amountPaise); // payer's debt shrinks
    left.set(t.to, (left.get(t.to) ?? 0) - t.amountPaise);
  }
  return left;
}

/** Independent brute force: most disjoint zero-sum groups, by trying every group containing the first item. */
function maxZeroSumGroups(values: number[]): number {
  if (values.length === 0) return 0;
  const [first, ...rest] = values;
  let best = -Infinity;
  for (let mask = 0; mask < 1 << rest.length; mask++) {
    const chosen = rest.filter((_, i) => mask & (1 << i));
    if (first + chosen.reduce((a, b) => a + b, 0) !== 0) continue;
    const remaining = rest.filter((_, i) => !(mask & (1 << i)));
    best = Math.max(best, 1 + maxZeroSumGroups(remaining));
  }
  return best;
}

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

describe("minimumTransfers", () => {
  it("settles a simple two-person debt with one payment", () => {
    expect(minimumTransfers(nets({ a: 500, b: -500 }))).toEqual([{ from: "b", to: "a", amountPaise: 500 }]);
  });

  it("returns [] when everything is already settled", () => {
    expect(minimumTransfers([])).toEqual([]);
    expect(minimumTransfers(nets({ a: 0, b: 0, c: 0 }))).toEqual([]);
  });

  it("ignores zero balances when counting people", () => {
    const transfers = minimumTransfers(nets({ a: 300, z: 0, b: -300 }));
    expect(transfers).toEqual([{ from: "b", to: "a", amountPaise: 300 }]);
  });

  it("finds two payments for interleaved independent pairs (+3/-3 and +7/-7)", () => {
    const start = nets({ A: 300, C: 700, B: -300, D: -700 });
    const transfers = minimumTransfers(start);
    expect(transfers).toHaveLength(2);
    expect(transfers).toEqual([
      { from: "D", to: "C", amountPaise: 700 },
      { from: "B", to: "A", amountPaise: 300 },
    ]);
  });

  it("beats greedy-over-everyone: DP needs 3 payments where greedy needs 4", () => {
    // Hidden zero-sum groups: {A +6, E -6} and {B +7, D -4, F -3}.
    const start = nets({ A: 600, B: 700, D: -400, E: -600, F: -300 });
    expect(greedyTransfers(start)).toHaveLength(4);

    const transfers = minimumTransfers(start);
    expect(transfers).toHaveLength(3);
    expect([...residuals(start, transfers).values()].every((v) => v === 0)).toBe(true);
    expect(transfers).toContainEqual({ from: "E", to: "A", amountPaise: 600 });
  });

  it("is deterministic regardless of input order", () => {
    const start = nets({ A: 600, B: 700, D: -400, E: -600, F: -300 });
    const shuffled = [start[3], start[1], start[4], start[0], start[2]];
    expect(minimumTransfers(shuffled)).toEqual(minimumTransfers(start));
  });

  it("is deterministic when several equally valid settlements exist (A+100, B+100, C-100, D-100)", () => {
    const orders = [
      nets({ A: 100, B: 100, C: -100, D: -100 }),
      nets({ D: -100, C: -100, B: 100, A: 100 }),
      nets({ B: 100, D: -100, A: 100, C: -100 }),
    ];
    const results = orders.map((order) => minimumTransfers(order));
    expect(results[0]).toHaveLength(2);
    expect(results[1]).toEqual(results[0]);
    expect(results[2]).toEqual(results[0]);
    expect(orders.map((order) => greedyTransfers(order))).toEqual(Array(3).fill(greedyTransfers(orders[0])));
  });

  it("throws when balances do not sum to zero", () => {
    expect(() => minimumTransfers(nets({ a: 100, b: -50 }))).toThrow(/sum to zero/);
  });

  it("falls back to greedy past the exact-solver limit and still settles everyone", () => {
    const size = MAX_EXACT_MEMBERS + 2;
    const start: Net[] = Array.from({ length: size }, (_, i) => ({
      memberId: `m${String(i).padStart(2, "0")}`,
      net: i % 2 === 0 ? 100 + i : -(100 + i - 1),
    }));
    start[size - 1].net -= start.reduce((total, b) => total + b.net, 0); // force zero-sum
    const transfers = minimumTransfers(start);
    expect(transfers.length).toBeLessThanOrEqual(size - 1);
    expect([...residuals(start, transfers).values()].every((v) => v === 0)).toBe(true);
  });

  it("solves the maximum exact size (20 non-zero balances) quickly", () => {
    // Ten independent +k/-k pairs with distinct k: the optimum is exactly 10 payments.
    const start: Net[] = [];
    for (let i = 1; i <= 10; i++) {
      start.push({ memberId: `p${i}`, net: i * 100 }, { memberId: `n${i}`, net: -i * 100 });
    }
    const startedAt = Date.now();
    const transfers = minimumTransfers(start);
    expect(transfers).toHaveLength(10);
    expect(Date.now() - startedAt).toBeLessThan(5000);
  });

  it("property: random zero-sum balances always settle to zero with minimal, positive, integer payments", () => {
    const random = seededRandom(20261030);
    for (let round = 0; round < 400; round++) {
      const size = 2 + Math.floor(random() * 9); // 2..10 members
      const values = Array.from({ length: size - 1 }, () => Math.round((random() - 0.5) * 20000));
      // Sometimes plant an exactly cancelling pair so multi-group cases are common.
      if (random() < 0.5 && size >= 4) {
        const planted = Math.round(random() * 5000) + 1;
        values[0] = planted;
        values[1] = -planted;
      }
      values.push(-values.reduce((a, b) => a + b, 0));
      const start = values.map((net, i) => ({ memberId: `m${i}`, net }));

      const transfers = minimumTransfers(start);
      const label = `round ${round}: ${JSON.stringify(values)}`;

      for (const t of transfers) {
        expect(Number.isInteger(t.amountPaise) && t.amountPaise > 0, label).toBe(true);
        expect(t.from, label).not.toBe(t.to);
      }
      expect([...residuals(start, transfers).values()].every((v) => v === 0), label).toBe(true);

      const nonZero = values.filter((v) => v !== 0);
      expect(transfers.length, label).toBeLessThanOrEqual(Math.max(0, nonZero.length - 1));
      // Minimality against the independent brute force.
      expect(transfers.length, label).toBe(nonZero.length === 0 ? 0 : nonZero.length - maxZeroSumGroups(nonZero));
    }
  });
});
