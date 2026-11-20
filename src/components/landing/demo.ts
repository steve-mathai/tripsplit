// Every figure on the landing page comes from here, computed from the Kochi demo trip with the app's own maths.
// Relative imports on purpose: the unit test imports this file and vitest has no "@/" alias.
import { DEMO_EXPENSES, DEMO_MEMBER_NAMES, DEMO_PLAN_ITEMS, DEMO_TRIP } from "../../db/demo-data";
import { computeBalances } from "../../lib/balances";
import { formatINR } from "../../lib/money";
import { minimumTransfers } from "../../lib/settle";
import { computeShares } from "../../lib/split";
import { summarize } from "../../lib/summary";
import { CATEGORIES, MEMBER_COLORS, type Category } from "../../lib/types";

export interface DemoPerson {
  name: string;
  /** Member colour handed out in join order, as the seed does. */
  color: string;
}

// Names double as member ids here, the same shortcut the demo-data unit test takes.
export const PEOPLE: DemoPerson[] = DEMO_MEMBER_NAMES.map((name, index) => ({
  name,
  color: MEMBER_COLORS[index % MEMBER_COLORS.length],
}));

export const TRIP_NAME = DEMO_TRIP.name;

const members = DEMO_MEMBER_NAMES.map((id) => ({ id }));
const expenseInputs = DEMO_EXPENSES.map((expense) => ({
  amountPaise: expense.amountPaise,
  paidBy: expense.paidBy,
  mode: expense.splitMode,
  category: expense.category,
  day: expense.day,
  splits: expense.splits.map((split) => ({ memberId: split.member, weight: split.weight })),
}));

const balances = computeBalances(members, expenseInputs);
const summary = summarize(members, expenseInputs);
const transfers = minimumTransfers(balances.map((b) => ({ memberId: b.memberId, net: b.net })));

export const personByName = (name: string): DemoPerson => {
  const person = PEOPLE.find((p) => p.name === name);
  if (!person) throw new Error(`Landing page asked for ${name}, who is not a demo member`);
  return person;
};

/** Biggest creditor first, so the balance river reads from who is owed most to who owes most. */
export const BALANCE_ROWS = balances
  .map((b) => ({ ...personByName(b.memberId), netPaise: b.net }))
  .sort((a, b) => b.netPaise - a.netPaise || a.name.localeCompare(b.name));

export const MAX_ABS_BALANCE_PAISE = Math.max(...BALANCE_ROWS.map((row) => Math.abs(row.netPaise)));

export const TRANSFERS = transfers.map((t) => ({ from: personByName(t.from), to: personByName(t.to), amountPaise: t.amountPaise }));
export const PAYMENT_COUNT = TRANSFERS.length;
export const PEOPLE_COUNT = PEOPLE.length;

export const TOTAL_PAISE = summary.totalPaise;
export const EXPENSE_COUNT = summary.expenseCount;

export const CATEGORY_ROWS = CATEGORIES.map((key) => ({ key, amountPaise: summary.byCategory[key] })).sort(
  (a, b) => b.amountPaise - a.amountPaise,
);

/** Whole percent of the total, the same rounding the app's expense list uses. */
export const sharePercent = (amountPaise: number): number => Math.round((amountPaise / TOTAL_PAISE) * 100);

/** The "Every bill" sheet lists the four bills of the trip's last day. */
const lastDay = DEMO_EXPENSES[DEMO_EXPENSES.length - 1].day;
export const BILL_ROWS = DEMO_EXPENSES.filter((e) => e.day === lastDay).map((e) => ({
  description: e.description,
  category: e.category as Category,
  amountPaise: e.amountPaise,
  paidBy: personByName(e.paidBy),
}));

export const TRIP_DAYS = new Set(DEMO_PLAN_ITEMS.map((item) => item.day)).size;

const firstDay = DEMO_TRIP.startDate;
const dayOne = DEMO_PLAN_ITEMS.filter((item) => item.day === firstDay);
export const DAY_ONE_PLANS = dayOne
  .filter((item) => item.kind === "plan" && item.time < "20:00") // the 8 pm dinner is the vote below
  .map((item) => ({
    time: item.time,
    title: item.title,
    notes: item.notes ?? null,
  }));
export const DAY_ONE_OPTIONS = dayOne
  .filter((item) => item.kind === "option")
  .map((item) => ({
    title: item.title,
    notes: item.notes ?? null,
    yes: (item.reactions ?? []).filter((r) => r.vote === "up").length,
    no: (item.reactions ?? []).filter((r) => r.vote === "down").length,
  }));

/** What the "Copy all" button on the Settle screen puts on the clipboard (same shape as settle-cards.tsx). */
export const GROUP_MESSAGE_LINES = [
  `${TRIP_NAME} - settle up`,
  ...TRANSFERS.map((t) => `${t.from.name} pays ${t.to.name} ${formatINR(t.amountPaise)}`),
];

/** The shares-split dinner shown filled in on the "Add what you spend" step. */
const toddy = DEMO_EXPENSES.find((e) => e.description.startsWith("Toddy shop dinner"));
if (!toddy) throw new Error("Demo data lost the toddy shop dinner");
const toddyShares = computeShares({
  amountPaise: toddy.amountPaise,
  mode: toddy.splitMode,
  splits: toddy.splits.map((s) => ({ memberId: s.member, weight: s.weight })),
});
export const TODDY = {
  description: "Toddy shop dinner",
  amountPaise: toddy.amountPaise,
  paidBy: personByName(toddy.paidBy),
  category: toddy.category,
  totalShares: toddy.splits.reduce((sum, s) => sum + s.weight, 0),
  rows: toddy.splits.map((s) => ({
    person: personByName(s.member),
    shares: s.weight,
    sharePaise: toddyShares.get(s.member) ?? 0,
  })),
};

// ---- Assertions: a wrong figure fails the build, not a visitor's trust. ----
function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Landing demo: ${message}`);
}

assert(balances.reduce((sum, b) => sum + b.net, 0) === 0, "balances do not sum to zero");

const remaining = new Map(balances.map((b) => [b.memberId, b.net]));
for (const t of transfers) {
  remaining.set(t.from, (remaining.get(t.from) ?? 0) + t.amountPaise);
  remaining.set(t.to, (remaining.get(t.to) ?? 0) - t.amountPaise);
}
assert([...remaining.values()].every((net) => net === 0), "the payments do not clear every balance");
assert(PAYMENT_COUNT > 0 && PAYMENT_COUNT < PEOPLE_COUNT, "a settlement needs fewer payments than people");

assert(CATEGORY_ROWS.reduce((sum, row) => sum + row.amountPaise, 0) === TOTAL_PAISE, "categories do not add up to the total");
assert(
  expenseInputs.reduce((sum, e) => sum + e.amountPaise, 0) === TOTAL_PAISE,
  "the summary total differs from the sum of the bills",
);
assert(summary.perPerson.reduce((sum, p) => sum + p.paidPaise, 0) === TOTAL_PAISE, "what people paid differs from the total");

assert(
  [...toddyShares.values()].reduce((sum, v) => sum + v, 0) === toddy.amountPaise,
  "the toddy dinner shares do not add up to the bill",
);
assert(GROUP_MESSAGE_LINES.length === PAYMENT_COUNT + 1, "the group message lacks a line for a payment");
assert(DAY_ONE_OPTIONS.every((o) => o.yes + o.no <= PEOPLE_COUNT), "a vote tally exceeds the group size");
assert(DAY_ONE_OPTIONS.length === 2 && DAY_ONE_PLANS.length === 5, "day one lost its vote or its plan rows");
assert(BILL_ROWS.length === 4, "the bills sheet expects four rows");
