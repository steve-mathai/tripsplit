import { MAX_AMOUNT_PAISE, parseINR } from "./money";

/** Same cap as the expense form's description box, so a prefilled form never truncates. */
export const QUICK_ADD_MAX_DESCRIPTION = 80;

export interface QuickAddMember {
  id: string;
  name: string;
}

/** What the text box understood. `ready` can be saved as is; `needs-payer` only lacks who paid; `unclear` goes to the full form. */
export type QuickAddResult =
  | { status: "ready"; amountPaise: number; description: string; paidBy: string }
  | { status: "needs-payer"; amountPaise: number; description: string }
  | {
      status: "unclear";
      reason: "no-amount" | "many-amounts" | "many-payers" | "no-description" | "long-description";
      amountPaise: number | null;
      description: string;
      paidBy: string | null;
    };

interface Span {
  start: number;
  end: number;
}

// A money-looking token: optional currency marker, then digits with commas and paise. The lookarounds keep
// "5kg", "10:30", "12/11", "-50" and digits glued to words from being read as amounts.
const AMOUNT_PATTERN = /(?<![\w.,:/-])((?:₹|rs\.?|inr)\s*)?(\d[\d,]*(?:\.\d+)?|\.\d+)(?![\w:/])/giu;

function findAmount(text: string): { paise: number; span: Span } | "none" | "many" {
  const found: { paise: number; span: Span; marked: boolean }[] = [];
  for (const match of text.matchAll(AMOUNT_PATTERN)) {
    const paise = parseINR(match[2]);
    if (paise === null || paise <= 0 || paise > MAX_AMOUNT_PAISE) continue;
    found.push({ paise, span: { start: match.index, end: match.index + match[0].length }, marked: Boolean(match[1]) });
  }
  // "2 chai ₹40": a currency marker settles which number is the money.
  const marked = found.filter((f) => f.marked);
  const pool = marked.length > 0 ? marked : found;
  if (pool.length === 0) return "none";
  if (pool.length > 1) return "many";
  return pool[0];
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Every member whose full name appears in the text as whole words (any case, any run of spaces). */
function findPayers(text: string, members: QuickAddMember[]): { member: QuickAddMember; span: Span }[] {
  const hits: { member: QuickAddMember; span: Span }[] = [];
  for (const member of members) {
    const words = member.name.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);
    if (words.length === 0) continue;
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${words.join("\\s+")}(?![\\p{L}\\p{N}])`, "iu");
    const match = pattern.exec(text);
    if (match) hits.push({ member, span: { start: match.index, end: match.index + match[0].length } });
  }
  // "Ann" inside "Mary Ann" is part of the longer name, not a second person.
  return hits.filter(
    (a) =>
      !hits.some(
        (b) =>
          b !== a &&
          b.span.start <= a.span.start &&
          b.span.end >= a.span.end &&
          b.span.end - b.span.start > a.span.end - a.span.start,
      ),
  );
}

function cut(text: string, span: Span): string {
  return `${text.slice(0, span.start)} ${text.slice(span.end)}`;
}

function tidy(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:.\-]+|[\s,;:.\-]+$/g, "")
    .trim();
}

/**
 * Reads quick text such as "450 chai Meera" or "₹1,200 auto fare". The payer is a member named in the
 * text (default: `currentMemberId`), the amount is the one money-looking number, and what is left is the
 * description. Pure: no defaults for split, date or category live here, the caller applies them.
 */
export function parseQuickAdd(text: string, members: QuickAddMember[], currentMemberId: string | null): QuickAddResult {
  const amount = findAmount(text);
  const withoutAmount = amount === "none" || amount === "many" ? text : cut(text, amount.span);
  const amountPaise = typeof amount === "object" ? amount.paise : null;

  const payers = findPayers(withoutAmount, members);
  let remainder = withoutAmount;
  let paidBy: string | null = null;
  if (payers.length === 1) {
    const { member, span } = payers[0];
    paidBy = member.id;
    // "chai paid by Meera" and "chai by Meera" read as "chai".
    const before = withoutAmount.slice(0, span.start).replace(/\b(?:paid\s+by|by)\s*$/i, "");
    remainder = `${before} ${withoutAmount.slice(span.end)}`;
  } else if (payers.length === 0 && currentMemberId && members.some((m) => m.id === currentMemberId)) {
    paidBy = currentMemberId;
  }
  const description = tidy(remainder);

  const unclear = (reason: Extract<QuickAddResult, { status: "unclear" }>["reason"]): QuickAddResult => ({
    status: "unclear",
    reason,
    amountPaise,
    description,
    paidBy,
  });

  if (amount === "none") return unclear("no-amount");
  if (amount === "many") return unclear("many-amounts");
  if (payers.length > 1) return unclear("many-payers");
  if (description === "") return unclear("no-description");
  if (description.length > QUICK_ADD_MAX_DESCRIPTION) return unclear("long-description");
  if (paidBy === null) return { status: "needs-payer", amountPaise: amount.paise, description };
  return { status: "ready", amountPaise: amount.paise, description, paidBy };
}

/** Rupee text a form's amount box and parseINR both accept ("450", "450.50"). */
function toRupeeText(paise: number): string {
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

/** Query string for /expenses/new carrying whatever was understood (amount in rupees, payer as member id). */
export function buildPrefillQuery(understood: { amountPaise: number | null; description: string; paidBy?: string | null }): string {
  const params = new URLSearchParams();
  if (understood.amountPaise !== null) params.set("amount", toRupeeText(understood.amountPaise));
  if (understood.description) params.set("description", understood.description);
  if (understood.paidBy) params.set("paidBy", understood.paidBy);
  return params.toString();
}

export interface ExpensePrefill {
  amountPaise?: number;
  description?: string;
  paidBy?: string;
}

/** Reads the query built above back into form values. The URL is untrusted: every value is checked, bad ones are dropped. */
export function readPrefill(
  search: Record<string, string | string[] | undefined>,
  memberIds: string[],
): ExpensePrefill {
  const first = (key: string) => {
    const value = search[key];
    return typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;
  };
  const prefill: ExpensePrefill = {};
  const amountText = first("amount");
  const amountPaise = amountText === undefined ? null : parseINR(amountText);
  if (amountPaise !== null && amountPaise > 0 && amountPaise <= MAX_AMOUNT_PAISE) prefill.amountPaise = amountPaise;
  const description = first("description")?.trim().slice(0, QUICK_ADD_MAX_DESCRIPTION);
  if (description) prefill.description = description;
  const paidBy = first("paidBy");
  if (paidBy && memberIds.includes(paidBy)) prefill.paidBy = paidBy;
  return prefill;
}
