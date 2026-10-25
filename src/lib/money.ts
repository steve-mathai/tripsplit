/** Largest expense we accept; keeps amounts inside a Postgres `integer` (2^31 - 1 paise). */
export const MAX_AMOUNT_PAISE = 2_000_000_000;

/** Groups digits the Indian way: last three, then pairs (1234567 -> 12,34,567). */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const head = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${head},${digits.slice(-3)}`;
}

/** Formats paise as ₹1,23,456 (paise shown only when non-zero: ₹1,234.50). */
export function formatINR(paise: number): string {
  if (!Number.isFinite(paise)) throw new RangeError("formatINR needs a finite number");
  const rounded = Math.round(paise);
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  const rupees = Math.floor(abs / 100);
  const fraction = abs % 100;
  const fractionText = fraction === 0 ? "" : `.${String(fraction).padStart(2, "0")}`;
  return `${sign}₹${groupIndian(String(rupees))}${fractionText}`;
}

/**
 * Parses user-typed rupees ("1,234.5", "₹ 1234", "Rs. 99") into paise, rounding
 * half up to the nearest paisa. Returns null for negatives, garbage or empty input.
 */
export function parseINR(input: string): number | null {
  const cleaned = input
    .trim()
    .replace(/^(?:₹|rs\.?|inr)\s*/i, "")
    .replace(/[,\s]/g, "");
  const match = /^(\d*)(?:\.(\d*))?$/.exec(cleaned);
  if (!match) return null;
  const [, whole, fraction = ""] = match;
  if (whole === "" && fraction === "") return null;
  if (whole.length > 10) return null; // far beyond MAX_AMOUNT_PAISE; avoids precision loss

  // Work on digits, not floats, so 1.005 and friends round predictably.
  const paddedFraction = fraction.padEnd(3, "0");
  let paise = Number(whole || "0") * 100 + Number(paddedFraction.slice(0, 2));
  if (paddedFraction[2] >= "5") paise += 1;
  return paise;
}
