import { UserError } from "./errors";
import { isRecord } from "./guards";
import { MAX_AMOUNT_PAISE } from "./money";
import type { Transfer } from "./types";

export interface MarkPaidInput extends Transfer {
  /** Whether the transfer was shown on the whole-rupee view, which decides which suggestions it is checked against. */
  round: boolean;
}

/** Narrows an untrusted "mark paid" request. Trip membership is checked by the caller. */
export function parseMarkPaidInput(raw: unknown): MarkPaidInput {
  if (!isRecord(raw)) throw new UserError("That payment could not be read. Refresh and try again");
  const { from, to, amountPaise, round } = raw;
  if (typeof from !== "string" || typeof to !== "string") throw new UserError("Pick who paid and who received");
  if (from === to) throw new UserError("Someone cannot pay themselves");
  if (typeof amountPaise !== "number" || !Number.isInteger(amountPaise) || amountPaise <= 0 || amountPaise > MAX_AMOUNT_PAISE) {
    throw new UserError("That amount is not valid");
  }
  return { from, to, amountPaise, round: round === true };
}
