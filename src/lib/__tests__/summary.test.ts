import { describe, expect, it } from "vitest";
import { toSummaryExpense } from "../expense-shape";
import { summarize } from "../summary";
import type { SummaryExpense } from "../types";

const members = ["a", "b", "c"].map((id) => ({ id }));
const both = [{ memberId: "a", weight: 1 }, { memberId: "b", weight: 1 }];

const expenses: SummaryExpense[] = [
  { amountPaise: 10001, paidBy: "a", mode: "equal", category: "food", day: "2026-10-31", splits: [...both, { memberId: "c", weight: 1 }] },
  { amountPaise: 5000, paidBy: "b", mode: "equal", category: "travel", day: "2026-10-30", splits: both },
  { amountPaise: 2000, paidBy: "c", mode: "equal", category: "food", day: "2026-10-31", splits: [{ memberId: "c", weight: 1 }] },
  { amountPaise: 700, paidBy: "a", mode: "equal", category: "stay", day: null, splits: both },
];

describe("summarize", () => {
  const summary = summarize(members, expenses);

  it("totals spend, count and per-head average", () => {
    expect(summary.totalPaise).toBe(17701);
    expect(summary.expenseCount).toBe(4);
    expect(summary.averagePerHeadPaise).toBe(5900); // 17701 / 3 = 5900.33
  });

  it("splits spend by category with all four keys present", () => {
    expect(summary.byCategory).toEqual({ stay: 700, travel: 5000, food: 12001, activities: 0 });
  });

  it("orders per-day spend by date with undated last", () => {
    expect(summary.perDay).toEqual([
      { day: "2026-10-30", totalPaise: 5000 },
      { day: "2026-10-31", totalPaise: 12001 },
      { day: null, totalPaise: 700 },
    ]);
  });

  it("tracks what each person paid versus consumed", () => {
    expect(summary.perPerson).toEqual([
      { memberId: "a", paidPaise: 10701, sharePaise: 3334 + 2500 + 350 },
      { memberId: "b", paidPaise: 5000, sharePaise: 3334 + 2500 + 350 },
      { memberId: "c", paidPaise: 2000, sharePaise: 3333 + 2000 },
    ]);
    const consumed = summary.perPerson.reduce((total, p) => total + p.sharePaise, 0);
    expect(consumed).toBe(summary.totalPaise);
  });

  it("handles a trip with no expenses or members", () => {
    expect(summarize([], [])).toMatchObject({ totalPaise: 0, averagePerHeadPaise: 0, perDay: [], perPerson: [] });
  });
});

describe("toSummaryExpense", () => {
  it("renames splitMode to mode so stored rows can feed the maths", () => {
    const stored = { amountPaise: 900, paidBy: "a", splitMode: "equal" as const, category: "food" as const, day: null, splits: both };
    expect(toSummaryExpense(stored)).toEqual({ amountPaise: 900, paidBy: "a", mode: "equal", category: "food", day: null, splits: both });
    expect(summarize(members, [toSummaryExpense(stored)]).totalPaise).toBe(900);
  });
});
