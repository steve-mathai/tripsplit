import { computeShares } from "./split";
import { CATEGORIES, type Category, type SummaryExpense } from "./types";

export interface TripSummary {
  expenseCount: number;
  totalPaise: number;
  /** total / number of members, rounded to the nearest paisa (0 with no members). */
  averagePerHeadPaise: number;
  /** What each member paid out of pocket vs the share of spend they consumed. */
  perPerson: { memberId: string; paidPaise: number; sharePaise: number }[];
  byCategory: Record<Category, number>;
  /** Ascending by date; expenses without a day are grouped last under `null`. */
  perDay: { day: string | null; totalPaise: number }[];
}

export function summarize(members: { id: string }[], expenses: SummaryExpense[]): TripSummary {
  const person = new Map(
    members.map((m) => [m.id, { memberId: m.id, paidPaise: 0, sharePaise: 0 }]),
  );
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  const byDay = new Map<string | null, number>();
  let totalPaise = 0;

  for (const expense of expenses) {
    const payer = person.get(expense.paidBy);
    if (!payer) throw new Error(`Expense references unknown member ${expense.paidBy}`);
    payer.paidPaise += expense.amountPaise;
    for (const [memberId, share] of computeShares(expense)) {
      const consumer = person.get(memberId);
      if (!consumer) throw new Error(`Expense references unknown member ${memberId}`);
      consumer.sharePaise += share;
    }
    totalPaise += expense.amountPaise;
    byCategory[expense.category] += expense.amountPaise;
    byDay.set(expense.day, (byDay.get(expense.day) ?? 0) + expense.amountPaise);
  }

  const perDay = [...byDay]
    .map(([day, dayTotal]) => ({ day, totalPaise: dayTotal }))
    .sort((a, b) =>
      a.day === b.day ? 0 : a.day === null ? 1 : b.day === null ? -1 : a.day.localeCompare(b.day),
    );

  return {
    expenseCount: expenses.length,
    totalPaise,
    averagePerHeadPaise: members.length === 0 ? 0 : Math.round(totalPaise / members.length),
    perPerson: [...person.values()],
    byCategory,
    perDay,
  };
}
