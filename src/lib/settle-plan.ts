import { roundingDriftPaise, roundToRupees, type Net } from "./rounding";
import { minimumTransfers } from "./settle";
import type { Transfer } from "./types";

export interface SettlePlan {
  /** The balances the transfers settle: rounded when `round` is on, the true ones otherwise. */
  nets: Net[];
  transfers: Transfer[];
  /** Paise moved by rounding (0 when `round` is off). */
  driftPaise: number;
}

/**
 * The one pipeline for what is left to pay: balances after settlements, rounded when asked,
 * then the fewest transfers. The Settle page and the mark-paid check both use it so they agree.
 */
export function planSettlement(balances: Net[], round: boolean): SettlePlan {
  const nets = round ? roundToRupees(balances) : balances.map(({ memberId, net }) => ({ memberId, net }));
  return { nets, transfers: minimumTransfers(nets), driftPaise: round ? roundingDriftPaise(balances, nets) : 0 };
}

export function isSuggestedTransfer(transfers: Transfer[], candidate: Transfer): boolean {
  return transfers.some((t) => t.from === candidate.from && t.to === candidate.to && t.amountPaise === candidate.amountPaise);
}
