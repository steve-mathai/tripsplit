import { describe, expect, it } from "vitest";
import { computeBalances } from "../balances";
import type { BalanceExpense } from "../types";

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
