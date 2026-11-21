export interface Net {
  memberId: string;
  net: number;
}

const PAISE_PER_RUPEE = 100;

/**
 * Rounds every net to a whole number of rupees by largest remainder: everyone goes down to the
 * rupee below, then the leftover rupees (always a whole count, because the nets sum to zero) go
 * one each to the members who lost the most by rounding down. Ties go to the lowest memberId, so
 * the result per member does not depend on input order. Output keeps the input order, sums to
 * exactly zero, and differs from each true net by less than one rupee.
 */
export function roundToRupees<T extends Net>(balances: T[]): T[] {
  if (balances.some((b) => !Number.isInteger(b.net))) throw new Error("Balances must be whole paise");
  if (balances.reduce((total, b) => total + b.net, 0) !== 0) throw new Error("Balances must sum to zero");

  const floored = balances.map((b) => {
    const rupees = Math.floor(b.net / PAISE_PER_RUPEE);
    return { memberId: b.memberId, rupees, remainder: b.net - rupees * PAISE_PER_RUPEE };
  });
  const leftoverRupees = -floored.reduce((total, f) => total + f.rupees, 0);

  const byLargestRemainder = [...floored].sort(
    (a, b) => b.remainder - a.remainder || (a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0),
  );
  const roundedUp = new Set(byLargestRemainder.slice(0, leftoverRupees).map((f) => f.memberId));

  return balances.map((b, i) => ({
    ...b,
    net: (floored[i].rupees + (roundedUp.has(b.memberId) ? 1 : 0)) * PAISE_PER_RUPEE,
  }));
}

/** Total paise moved between members by rounding: half the sum of absolute differences (the up and down sides are equal). */
export function roundingDriftPaise(before: Net[], after: Net[]): number {
  const afterById = new Map(after.map((b) => [b.memberId, b.net]));
  const totalAbs = before.reduce((total, b) => total + Math.abs((afterById.get(b.memberId) ?? 0) - b.net), 0);
  return totalAbs / 2;
}
