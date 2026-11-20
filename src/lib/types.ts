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

/**
 * Person colours handed out to members in join order (wraps around). Only the hue is used (see
 * person-tint.ts). Rules: no hue between 245 and 300 degrees (no violet or indigo), and neighbours
 * in this list are at least 60 degrees apart, including the wrap from last to first.
 * Hues in order: 328, 80, 205, 34, 155, 350, 105, 228, 56, 180, 12, 130.
 */
export const MEMBER_COLORS = [
  "#9e1a60",
  "#729e1a",
  "#1a679e",
  "#9e651a",
  "#1a9e67",
  "#9e1a30",
  "#3b9e1a",
  "#1a349e",
  "#9e951a",
  "#1a9e9e",
  "#9e341a",
  "#1a9e30",
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

/** Per-trip hard caps (abuse limits, far above real use). Enforced server-side in queries.ts. */
export const MAX_MEMBERS = 50;
export const MAX_PLAN_ITEMS = 500;
export const MAX_EXPENSES = 500;

/** Maximum characters per free-text field, enforced server-side after sanitising. */
export const TEXT_LIMITS = {
  tripName: 80,
  baseLocation: 80,
  memberName: 40,
  planTitle: 120,
  planNotes: 500,
  expenseDescription: 120,
  upiId: 50,
} as const;
