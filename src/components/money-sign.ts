import { formatINR } from "../lib/money";

export type MoneyTone = "positive" | "owes" | "settled";

/**
 * Display convention for a balance in paise (positive = gets back):
 *   gets back  ->  "+₹1,200"  tone "positive" (green)
 *   owes       ->  "−₹1,200"  tone "owes"     (ink, U+2212 minus, never red)
 *   zero       ->  "settled up"  tone "settled"  (grey)
 */
export function signedINR(paise: number): { text: string; tone: MoneyTone } {
  const rounded = Math.round(paise);
  if (rounded > 0) return { text: `+${formatINR(rounded)}`, tone: "positive" };
  if (rounded < 0) return { text: `−${formatINR(-rounded)}`, tone: "owes" };
  return { text: "settled up", tone: "settled" };
}

/** Tailwind text colour per tone. */
export const MONEY_TONE_CLASS: Record<MoneyTone, string> = {
  positive: "text-positive",
  owes: "text-text",
  settled: "text-muted",
};
