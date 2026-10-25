export const CATEGORIES = ["stay", "travel", "food", "activities"] as const;
export type Category = (typeof CATEGORIES)[number];

export const SPLIT_MODES = ["equal", "exact", "shares"] as const;
export type SplitMode = (typeof SPLIT_MODES)[number];

export const PLAN_KINDS = ["plan", "option"] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

export const VOTES = ["up", "down"] as const;
export type Vote = (typeof VOTES)[number];

export const EMOJIS = ["🔥", "😍", "😴", "💸", "🤔"] as const;
export type Emoji = (typeof EMOJIS)[number];

/** Avatar colours handed out to members in join order (wraps around). */
export const MEMBER_COLORS = [
  "#0f766e",
  "#d97706",
  "#be185d",
  "#4f46e5",
  "#15803d",
  "#b91c1c",
  "#0369a1",
  "#7e22ce",
  "#c2410c",
  "#4d7c0f",
  "#0e7490",
  "#a21caf",
] as const;

/**
 * One member's slice of an expense. `weight` means: equal -> 1 if included;
 * shares -> number of shares; exact -> amount owed in paise.
 */
export interface SplitInput {
  memberId: string;
  weight: number;
}

export interface SplitRequest {
  amountPaise: number;
  mode: SplitMode;
  splits: SplitInput[];
}

/** The part of an expense that balance maths needs. */
export interface BalanceExpense extends SplitRequest {
  paidBy: string;
}

export interface SummaryExpense extends BalanceExpense {
  category: Category;
  /** ISO date (YYYY-MM-DD) or null when the expense is not tied to a day. */
  day: string | null;
}

export interface Balance {
  memberId: string;
  paid: number;
  owed: number;
  /** paid - owed; positive means the member should receive money. */
  net: number;
}

export interface Transfer {
  from: string;
  to: string;
  amountPaise: number;
}
