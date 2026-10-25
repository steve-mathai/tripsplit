import type { Category, SplitInput, SplitMode } from "@/lib/types";

/** What the expense form sends to the save action. Amounts are integer paise. */
export interface ExpensePayload {
  description: string;
  amountPaise: number;
  category: Category;
  paidBy: string;
  day: string | null;
  mode: SplitMode;
  splits: SplitInput[];
}

export type ActionResult = { error: string } | undefined;
