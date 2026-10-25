import { computeShares } from "./split";
import type { Balance, BalanceExpense } from "./types";

/**
 * Per-member paid / owed / net over all expenses, in the order of `members`.
 * Throws when an expense references someone who is not in `members`, because
 * silently dropping them would break the zero-sum invariant.
 */
export function computeBalances(
  members: { id: string }[],
  expenses: BalanceExpense[],
): Balance[] {
  const byId = new Map<string, Balance>(
    members.map((m) => [m.id, { memberId: m.id, paid: 0, owed: 0, net: 0 }]),
  );
  const lookup = (id: string): Balance => {
    const balance = byId.get(id);
    if (!balance) throw new Error(`Expense references unknown member ${id}`);
    return balance;
  };

  for (const expense of expenses) {
    lookup(expense.paidBy).paid += expense.amountPaise;
    for (const [memberId, share] of computeShares(expense)) lookup(memberId).owed += share;
  }

  const balances = [...byId.values()];
  for (const balance of balances) balance.net = balance.paid - balance.owed;
  return balances;
}
