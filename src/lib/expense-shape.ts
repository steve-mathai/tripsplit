import type { Category, SplitInput, SplitMode, SummaryExpense } from "./types";

/** The subset of a stored expense row (see ExpenseWithSplits in db/queries) the maths needs. */
export interface StoredExpense {
  amountPaise: number;
  paidBy: string;
  splitMode: SplitMode;
  category: Category;
  day: string | null;
  splits: SplitInput[];
}

/** Maps a stored expense (`splitMode`) to the shape computeBalances/summarize take (`mode`). */
export function toSummaryExpense(expense: StoredExpense): SummaryExpense {
  return {
    amountPaise: expense.amountPaise,
    paidBy: expense.paidBy,
    mode: expense.splitMode,
    category: expense.category,
    day: expense.day,
    splits: expense.splits,
  };
}
