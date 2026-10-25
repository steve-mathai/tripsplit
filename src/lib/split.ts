import { UserError } from "./errors";
import { formatINR, MAX_AMOUNT_PAISE } from "./money";
import { SPLIT_MODES, type SplitRequest } from "./types";

export class SplitError extends UserError {}

/** Generous for a friend group (a share is a head-count multiplier), tight enough to stop absurd weights. */
export const MAX_SHARES_PER_PERSON = 1000;

/**
 * Returns a user-facing message if the split cannot be applied, otherwise null.
 * Used by the form for live feedback and by computeShares as its gatekeeper.
 */
export function validateSplit({ amountPaise, mode, splits }: SplitRequest): string | null {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    return "Enter an amount greater than ₹0";
  }
  if (amountPaise > MAX_AMOUNT_PAISE) {
    return `Amount can be at most ${formatINR(MAX_AMOUNT_PAISE)}`;
  }
  if (!SPLIT_MODES.includes(mode)) return "Pick how to split: equally, exact amounts or shares";
  if (splits.length === 0) return "Pick at least one person to split with";
  if (new Set(splits.map((s) => s.memberId)).size !== splits.length) {
    return "Each person can only appear once in the split";
  }
  if (splits.some((s) => !Number.isInteger(s.weight) || s.weight < 0)) {
    return "Shares and amounts must be whole, non-negative numbers";
  }
  if (mode === "shares" && splits.some((s) => s.weight > MAX_SHARES_PER_PERSON)) {
    return `Shares can be at most ${MAX_SHARES_PER_PERSON} per person`;
  }
  if (splits.some((s) => s.weight > MAX_AMOUNT_PAISE)) {
    return `Amounts can be at most ${formatINR(MAX_AMOUNT_PAISE)}`;
  }

  if (mode === "equal") return null; // weights are ignored; every listed member counts once
  const totalWeight = splits.reduce((sum, s) => sum + s.weight, 0);
  if (mode === "shares") {
    return totalWeight > 0 ? null : "Give at least one person a share";
  }
  if (totalWeight !== amountPaise) {
    const diff = amountPaise - totalWeight;
    return diff > 0
      ? `${formatINR(diff)} left to assign`
      : `Amounts are ${formatINR(-diff)} over the total`;
  }
  return null;
}

/**
 * Splits an expense into per-member paise that sum exactly to amountPaise.
 * Equal/shares use the largest-remainder method; ties go to the lowest memberId,
 * not to input order, so the form preview and the server always agree.
 * Throws SplitError when validateSplit would complain.
 */
export function computeShares(request: SplitRequest): Map<string, number> {
  const problem = validateSplit(request);
  if (problem) throw new SplitError(problem);

  const { amountPaise, mode, splits } = request;
  const result = new Map<string, number>();

  if (mode === "exact") {
    for (const { memberId, weight } of splits) result.set(memberId, weight);
    return result;
  }

  const weights = splits.map((s) => (mode === "equal" ? 1 : s.weight));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // BigInt keeps amount * weight exact even for large inputs.
  const amount = BigInt(amountPaise);
  const total = BigInt(totalWeight);
  const parts = weights.map((w) => {
    const product = amount * BigInt(w);
    return { base: Number(product / total), remainder: product % total };
  });

  let leftover = amountPaise - parts.reduce((sum, p) => sum + p.base, 0);
  const byRemainder = parts
    .map((p, index) => ({ index, memberId: splits[index].memberId, remainder: p.remainder }))
    .sort((a, b) =>
      a.remainder === b.remainder ? (a.memberId < b.memberId ? -1 : 1) : a.remainder > b.remainder ? -1 : 1,
    );
  for (const { index } of byRemainder) {
    if (leftover === 0) break;
    parts[index].base += 1;
    leftover -= 1;
  }

  splits.forEach((s, index) => result.set(s.memberId, parts[index].base));
  return result;
}
