import { describe, expect, it } from "vitest";
import { computeBalances } from "../balances";
import { minimumTransfers } from "../settle";
import type { BalanceExpense, Transfer } from "../types";

const members = ["a", "b", "c", "d"].map((id) => ({ id }));

const mixedExpenses: BalanceExpense[] = [
  { amountPaise: 10000, paidBy: "a", mode: "equal", splits: members.map((m) => ({ memberId: m.id, weight: 1 })) },
  {
    amountPaise: 7777,
    paidBy: "b",
    mode: "shares",
    splits: [
      { memberId: "a", weight: 2 },
      { memberId: "b", weight: 1 },
      { memberId: "c", weight: 1 },
    ],
  },
  {
    amountPaise: 5000,
    paidBy: "c",
    mode: "exact",
    splits: [
      { memberId: "c", weight: 3000 },
      { memberId: "d", weight: 2000 },
    ],
  },
  { amountPaise: 1333, paidBy: "d", mode: "equal", splits: [{ memberId: "b", weight: 1 }, { memberId: "d", weight: 1 }] },
];

describe("computeBalances", () => {
  it("sums to zero over mixed expenses", () => {
    const balances = computeBalances(members, mixedExpenses);
    expect(balances.reduce((total, b) => total + b.net, 0)).toBe(0);
    expect(balances.reduce((total, b) => total + b.paid, 0)).toBe(10000 + 7777 + 5000 + 1333);
    expect(balances.reduce((total, b) => total + b.owed, 0)).toBe(10000 + 7777 + 5000 + 1333);
  });

  it("reports paid, owed and net per member in member order", () => {
    const balances = computeBalances(members, [
      { amountPaise: 9000, paidBy: "a", mode: "equal", splits: [{ memberId: "a", weight: 1 }, { memberId: "b", weight: 1 }, { memberId: "c", weight: 1 }] },
    ]);
    expect(balances).toEqual([
      { memberId: "a", paid: 9000, owed: 3000, net: 6000 },
      { memberId: "b", paid: 0, owed: 3000, net: -3000 },
      { memberId: "c", paid: 0, owed: 3000, net: -3000 },
      { memberId: "d", paid: 0, owed: 0, net: 0 },
    ]);
  });

  it("leaves non-participants of a partial-group expense at zero owed", () => {
    const balances = computeBalances(members, [
      { amountPaise: 4000, paidBy: "a", mode: "equal", splits: [{ memberId: "a", weight: 1 }, { memberId: "b", weight: 1 }] },
    ]);
    expect(balances.find((b) => b.memberId === "c")).toMatchObject({ paid: 0, owed: 0, net: 0 });
    expect(balances.find((b) => b.memberId === "d")).toMatchObject({ paid: 0, owed: 0, net: 0 });
  });

  it("returns all zero with no expenses", () => {
    expect(computeBalances(members, []).every((b) => b.net === 0 && b.paid === 0 && b.owed === 0)).toBe(true);
  });

  it("throws on an expense that mentions an unknown member", () => {
    expect(() =>
      computeBalances(members, [{ amountPaise: 100, paidBy: "ghost", mode: "equal", splits: [{ memberId: "a", weight: 1 }] }]),
    ).toThrow(/unknown member ghost/);
  });
});

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

describe("computeBalances with settlements", () => {
  const oneExpense: BalanceExpense[] = [
    { amountPaise: 9000, paidBy: "a", mode: "equal", splits: [{ memberId: "a", weight: 1 }, { memberId: "b", weight: 1 }, { memberId: "c", weight: 1 }] },
  ];

  it("raises the payer's paid, lowers the receiver's, and leaves owed alone", () => {
    const balances = computeBalances(members, oneExpense, [{ from: "b", to: "a", amountPaise: 3000 }]);
    expect(balances).toEqual([
      { memberId: "a", paid: 6000, owed: 3000, net: 3000 },
      { memberId: "b", paid: 3000, owed: 3000, net: 0 },
      { memberId: "c", paid: 0, owed: 3000, net: -3000 },
      { memberId: "d", paid: 0, owed: 0, net: 0 },
    ]);
  });

  it("is unchanged when the settlement list is empty", () => {
    expect(computeBalances(members, mixedExpenses, [])).toEqual(computeBalances(members, mixedExpenses));
  });

  it("still sums to zero with settlements over mixed expenses", () => {
    const balances = computeBalances(members, mixedExpenses, [
      { from: "b", to: "a", amountPaise: 1234 },
      { from: "d", to: "c", amountPaise: 99 },
    ]);
    expect(balances.reduce((total, b) => total + b.net, 0)).toBe(0);
  });

  it("throws on a settlement that mentions an unknown member", () => {
    expect(() => computeBalances(members, oneExpense, [{ from: "ghost", to: "a", amountPaise: 100 }])).toThrow(/unknown member ghost/);
  });

  it("a settlement that clears a pair leaves the same minimum as recomputing from scratch", () => {
    // a is owed 6000, b and c owe 3000 each. b pays a in full: what is left is exactly a two-person case.
    const after = computeBalances(members, oneExpense, [{ from: "b", to: "a", amountPaise: 3000 }]);
    const scratch = [
      { memberId: "a", net: 3000 },
      { memberId: "b", net: 0 },
      { memberId: "c", net: -3000 },
      { memberId: "d", net: 0 },
    ];
    expect(minimumTransfers(after)).toEqual(minimumTransfers(scratch));
    expect(minimumTransfers(after)).toEqual([{ from: "c", to: "a", amountPaise: 3000 }]);
  });

  it("property: recording suggested transfers keeps nets at zero and removes exactly one payment from a minimum plan", () => {
    const random = seededRandom(20261109);
    const people = ["a", "b", "c", "d", "e", "f", "g"].map((id) => ({ id }));
    for (let round = 0; round < 300; round++) {
      const expenses: BalanceExpense[] = Array.from({ length: 1 + Math.floor(random() * 5) }, () => {
        const included = people.filter(() => random() < 0.6);
        const group = included.length >= 2 ? included : people.slice(0, 2);
        return {
          amountPaise: 100 + Math.floor(random() * 500_000),
          paidBy: people[Math.floor(random() * people.length)].id,
          mode: "equal",
          splits: group.map((m) => ({ memberId: m.id, weight: 1 })),
        };
      });
      const label = `round ${round}`;
      const plan = minimumTransfers(computeBalances(people, expenses));

      const recorded: Transfer[] = [];
      for (const [index, transfer] of plan.entries()) {
        recorded.push(transfer);
        const balances = computeBalances(people, expenses, recorded);
        expect(balances.reduce((total, b) => total + b.net, 0), label).toBe(0);
        // The plan was minimal, so the rest of it is minimal too: one fewer payment each time.
        expect(minimumTransfers(balances).length, label).toBe(plan.length - index - 1);
      }
      expect(computeBalances(people, expenses, recorded).every((b) => b.net === 0), label).toBe(true);
    }
  });
});
