import { UserError } from "./errors";

// C0 controls (NUL included), DEL and C1 controls; newline handling is done separately.
const CONTROLS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
// Bidi embeddings/overrides/isolates and the direction marks, which can make text read
// differently from how it is stored. Also zero-width space, word joiner and BOM (invisible padding).
const BIDI_AND_INVISIBLE = /[\u061C\u200B\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g;
// ZWJ and ZWNJ are needed by emoji sequences and Indic scripts, but only between two letters.
const JOINERS = /[\u200C\u200D]/;
const LONE_JOINERS = /^[\u200C\u200D]+|[\u200C\u200D]+$|(?<=\s)[\u200C\u200D]+|[\u200C\u200D]+(?=\s)/g;
const JOINER_RUNS = /([\u200C\u200D])[\u200C\u200D]+/g;

/**
 * Cleans untrusted text. Single-line (default): all whitespace runs become one space.
 * Multi-line (notes): newlines survive, runs of spaces and tabs collapse, and 3+ blank lines shrink to one.
 */
export function sanitizeText(raw: string, multiline = false): string {
  let text = raw.normalize("NFC").replace(/\r\n?|\u2028|\u2029/g, "\n");
  text = text.replace(CONTROLS, "").replace(BIDI_AND_INVISIBLE, "");
  // Joiners go before whitespace collapsing so a joiner stranded between spaces leaves one space, not two.
  if (JOINERS.test(text)) text = text.replace(JOINER_RUNS, "$1").replace(LONE_JOINERS, "");
  text = multiline
    ? text.replace(/[^\S\n]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n")
    : text.replace(/\s+/g, " ");
  return text.trim();
}

export function requireText(raw: unknown, label: string, maxLength: number): string {
  if (typeof raw !== "string") throw new UserError(`${label} is required`);
  const text = sanitizeText(raw);
  if (text === "") throw new UserError(`${label} is required`);
  if (text.length > maxLength) throw new UserError(`${label} must be at most ${maxLength} characters`);
  return text;
}

export function optionalText(raw: unknown, label: string, maxLength: number, multiline = false): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") throw new UserError(`${label} is not valid`);
  const text = sanitizeText(raw, multiline);
  if (text === "") return null;
  if (text.length > maxLength) throw new UserError(`${label} must be at most ${maxLength} characters`);
  return text;
}
