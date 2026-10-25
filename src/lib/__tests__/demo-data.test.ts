import { describe, expect, it } from "vitest";
import { DEMO_EXPENSES, DEMO_MEMBER_NAMES, DEMO_PLAN_ITEMS, DEMO_TRIP } from "../../db/demo-data";
import { computeBalances } from "../balances";
import { minimumTransfers } from "../settle";
import { computeShares, validateSplit } from "../split";
import type { BalanceExpense, SummaryExpense } from "../types";
import { summarize } from "../summary";

// Member names double as ids here; the seed swaps in generated ids.
const members = DEMO_MEMBER_NAMES.map((id) => ({ id }));
const expenses: SummaryExpense[] = DEMO_EXPENSES.map((e) => ({
  amountPaise: e.amountPaise,
  paidBy: e.paidBy,
  mode: e.splitMode,
  category: e.category,
  day: e.day,
  splits: e.splits.map((s) => ({ memberId: s.member, weight: s.weight })),
}));

describe("Kochi demo data", () => {
  it("has 11 members, ~20-30 expenses covering every split mode and category", () => {
    expect(members).toHaveLength(11);
    expect(DEMO_EXPENSES.length).toBeGreaterThanOrEqual(20);
    expect(DEMO_EXPENSES.length).toBeLessThanOrEqual(30);
    expect(new Set(DEMO_EXPENSES.map((e) => e.splitMode))).toEqual(new Set(["equal", "exact", "shares"]));
    expect(new Set(DEMO_EXPENSES.map((e) => e.category))).toEqual(new Set(["stay", "travel", "food", "activities"]));
    expect(DEMO_EXPENSES.some((e) => e.splits.length < 11)).toBe(true);
  });

  it("only mentions known members and stays within the trip dates", () => {
    const names = new Set<string>(DEMO_MEMBER_NAMES);
    for (const e of DEMO_EXPENSES) {
      expect(names.has(e.paidBy), e.description).toBe(true);
      for (const s of e.splits) expect(names.has(s.member), e.description).toBe(true);
      expect(e.day >= DEMO_TRIP.startDate && e.day <= DEMO_TRIP.endDate, e.description).toBe(true);
    }
    for (const item of DEMO_PLAN_ITEMS) {
      expect(names.has(item.createdBy), item.title).toBe(true);
      for (const r of item.reactions ?? []) expect(names.has(r.member), item.title).toBe(true);
      expect(item.day >= DEMO_TRIP.startDate && item.day <= DEMO_TRIP.endDate, item.title).toBe(true);
    }
  });

  it("has valid splits whose shares add up exactly to each amount", () => {
    for (const e of expenses) {
      expect(validateSplit(e), String(e.amountPaise)).toBeNull();
      const total = [...computeShares(e).values()].reduce((a, b) => a + b, 0);
      expect(total).toBe(e.amountPaise);
    }
  });

  it("includes odd amounts that force rounding", () => {
    const rounded = expenses.filter((e) => e.mode !== "exact" && e.amountPaise % e.splits.length !== 0);
    expect(rounded.length).toBeGreaterThanOrEqual(5);
  });

  it("settles to zero: balances sum to zero and the minimum transfers clear everyone", () => {
    const balances = computeBalances(members, expenses as BalanceExpense[]);
    expect(balances.reduce((total, b) => total + b.net, 0)).toBe(0);

    const left = new Map(balances.map((b) => [b.memberId, b.net]));
    const transfers = minimumTransfers(balances);
    for (const t of transfers) {
      left.set(t.from, (left.get(t.from) ?? 0) + t.amountPaise);
      left.set(t.to, (left.get(t.to) ?? 0) - t.amountPaise);
    }
    expect([...left.values()].every((v) => v === 0)).toBe(true);
    expect(transfers.length).toBeGreaterThan(0);
    expect(transfers.length).toBeLessThanOrEqual(10);
  });

  it("summarises to the same total as the raw expenses", () => {
    const summary = summarize(members, expenses);
    expect(summary.totalPaise).toBe(DEMO_EXPENSES.reduce((total, e) => total + e.amountPaise, 0));
    expect(summary.perPerson.reduce((total, p) => total + p.sharePaise, 0)).toBe(summary.totalPaise);
  });

  it("has reactions on options and at most one vote and emoji per member per item", () => {
    const options = DEMO_PLAN_ITEMS.filter((i) => i.kind === "option");
    expect(options.length).toBeGreaterThanOrEqual(6);
    for (const item of DEMO_PLAN_ITEMS) {
      const voters = (item.reactions ?? []).map((r) => r.member);
      expect(new Set(voters).size, item.title).toBe(voters.length);
    }
    for (const item of options) {
      expect(item.reactions?.some((r) => r.vote), item.title).toBe(true);
    }
  });
});
