import type { ExpenseWithSplits } from "@/db/queries";
import type { SummaryExpense } from "@/lib/types";

/** Maps stored expenses to the shape the pure balance/summary maths expects (splitMode -> mode). */
export function toMathsExpenses(expenses: ExpenseWithSplits[]): SummaryExpense[] {
  return expenses.map((e) => ({
    amountPaise: e.amountPaise,
    mode: e.splitMode,
    splits: e.splits,
    paidBy: e.paidBy,
    category: e.category,
    day: e.day,
  }));
}
