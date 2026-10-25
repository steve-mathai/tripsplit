import type { Transfer } from "./types";

interface NetBalance {
  memberId: string;
  net: number;
}

/** Above this many non-zero balances the 2^n subset DP is too heavy (2^20 masks is ~10 MB). */
export const MAX_EXACT_MEMBERS = 20;

/**
 * Pays off one group: the largest debtor repeatedly pays the largest creditor.
 * Ties break by position in `group`, which callers pass in memberId order.
 */
function settleGreedily(group: NetBalance[]): Transfer[] {
  const largestFirst = (a: { amount: number; order: number }, b: typeof a) =>
    b.amount - a.amount || a.order - b.order;
  const debtors = group
    .map((b, order) => ({ memberId: b.memberId, amount: -b.net, order }))
    .filter((b) => b.amount > 0);
  const creditors = group
    .map((b, order) => ({ memberId: b.memberId, amount: b.net, order }))
    .filter((b) => b.amount > 0);

  const transfers: Transfer[] = [];
  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort(largestFirst);
    creditors.sort(largestFirst);
    const debtor = debtors[0];
    const creditor = creditors[0];
    const amountPaise = Math.min(debtor.amount, creditor.amount);
    transfers.push({ from: debtor.memberId, to: creditor.memberId, amountPaise });
    debtor.amount -= amountPaise;
    creditor.amount -= amountPaise;
    if (debtor.amount === 0) debtors.shift();
    if (creditor.amount === 0) creditors.shift();
  }
  return transfers;
}

function sortTransfers(transfers: Transfer[]): Transfer[] {
  return transfers.sort(
    (a, b) =>
      b.amountPaise - a.amountPaise ||
      a.from.localeCompare(b.from) ||
      a.to.localeCompare(b.to),
  );
}

/** Non-zero balances in memberId order, so every tie below resolves the same way whatever order callers pass. */
function nonZeroBalances(balances: NetBalance[]): NetBalance[] {
  const nonZero = balances.filter((b) => b.net !== 0);
  if (nonZero.reduce((sum, b) => sum + b.net, 0) !== 0) {
    throw new Error("Balances do not sum to zero");
  }
  return nonZero.sort((a, b) => (a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0));
}

/** Plain greedy over everybody; not always minimal, used as the large-group fallback. */
export function greedyTransfers(balances: NetBalance[]): Transfer[] {
  return sortTransfers(settleGreedily(nonZeroBalances(balances)));
}

/**
 * Splits balances into the largest possible number of disjoint zero-sum groups.
 * best[mask] is the max number of zero-sum prefixes over orderings of mask's
 * members; walking the stored choices back yields one optimal ordering, and the
 * points where its running sum hits zero are the group boundaries.
 */
function partitionIntoZeroSumGroups(items: NetBalance[]): NetBalance[][] {
  const count = items.length;
  const full = (1 << count) - 1;
  const sums = new Float64Array(full + 1); // Float64: 20 nets in paise can exceed int32
  const best = new Int8Array(full + 1);
  const lastAdded = new Int8Array(full + 1);

  for (let mask = 1; mask <= full; mask++) {
    const lowBit = 31 - Math.clz32(mask & -mask);
    sums[mask] = sums[mask & (mask - 1)] + items[lowBit].net;

    let bestPrevious = -1;
    let bestBit = -1;
    for (let bit = 0; bit < count; bit++) {
      if (!(mask & (1 << bit))) continue;
      const previous = best[mask ^ (1 << bit)];
      if (previous > bestPrevious) {
        bestPrevious = previous;
        bestBit = bit;
      }
    }
    best[mask] = bestPrevious + (sums[mask] === 0 ? 1 : 0);
    lastAdded[mask] = bestBit;
  }

  const order: number[] = [];
  for (let mask = full; mask !== 0; mask ^= 1 << lastAdded[mask]) order.push(lastAdded[mask]);
  order.reverse();

  const groups: NetBalance[][] = [];
  let current: NetBalance[] = [];
  let running = 0;
  for (const index of order) {
    current.push(items[index]);
    running += items[index].net;
    if (running === 0) {
      groups.push(current);
      current = [];
    }
  }
  return groups;
}

/**
 * Fewest payments that settle everyone. Minimum = (#non-zero balances) -
 * (max number of disjoint zero-sum groups), because an indivisible group of k
 * people needs exactly k - 1 payments. Falls back to plain greedy beyond
 * MAX_EXACT_MEMBERS non-zero balances.
 */
export function minimumTransfers(balances: NetBalance[]): Transfer[] {
  const nonZero = nonZeroBalances(balances);
  if (nonZero.length === 0) return [];
  if (nonZero.length > MAX_EXACT_MEMBERS) return sortTransfers(settleGreedily(nonZero));

  const transfers = partitionIntoZeroSumGroups(nonZero).flatMap(settleGreedily);
  return sortTransfers(transfers);
}
