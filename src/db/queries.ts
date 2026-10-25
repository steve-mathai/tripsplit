// Data access for the UI. Plain async functions, no caching directives: callers decide
// (under Cache Components these must run inside <Suspense> or after connection()).
// Multi-step writes go through runAtomically (one transaction on both drivers), so a failure
// midway never leaves a half-written expense or trip behind.
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { UserError } from "../lib/errors";
import { isOneOf, isRecord } from "../lib/guards";
import { toUserError } from "../lib/pg-errors";
import { SplitError, validateSplit } from "../lib/split";
import {
  CATEGORIES,
  EMOJIS,
  MEMBER_COLORS,
  SPLIT_MODES,
  VOTES,
  type Category,
  type Emoji,
  type PlanKind,
  type SplitInput,
  type SplitMode,
  type Vote,
} from "../lib/types";
import { db, runAtomically } from "./index";
import { expenseSplits, expenses, members, planItems, trips, votes } from "./schema";

export type Trip = typeof trips.$inferSelect;
export type Member = typeof members.$inferSelect;
export type PlanItem = typeof planItems.$inferSelect;
export type TripWithMembers = Trip & { members: Member[] };
export type ExpenseWithSplits = typeof expenses.$inferSelect & { splits: SplitInput[] };

export interface PlanItemWithReactions extends PlanItem {
  upMemberIds: string[];
  downMemberIds: string[];
  /** Only emojis someone used, in the canonical EMOJIS order. */
  reactions: { emoji: Emoji; memberIds: string[] }[];
}

export interface ExpenseInput {
  description: string;
  category: Category;
  amountPaise: number;
  paidBy: string;
  splitMode: SplitMode;
  /** 'YYYY-MM-DD' or null. */
  day: string | null;
  splits: SplitInput[];
}

export interface NewMember {
  name: string;
  upiId?: string | null;
}

export interface NewTrip {
  name: string;
  baseLocation: string;
  startDate: string;
  endDate: string;
  /** At least one; duplicates (case-insensitive) are collapsed. The first is conventionally "you". */
  members: NewMember[];
  /** Only for fixed slugs such as the demo trip; normally generated from the name. */
  slug?: string;
}

export interface NewPlanItem {
  day: string;
  time?: string | null;
  title: string;
  notes?: string | null;
  kind?: PlanKind;
  createdBy?: string | null;
}

const newId = () => crypto.randomUUID();

// ---------- input cleaning ----------

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const UPI_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}$/;

function requireText(raw: unknown, label: string, maxLength: number): string {
  if (typeof raw !== "string") throw new UserError(`${label} is required`);
  const text = raw.replace(/\s+/g, " ").trim();
  if (text === "") throw new UserError(`${label} is required`);
  if (text.length > maxLength) throw new UserError(`${label} must be at most ${maxLength} characters`);
  return text;
}

function optionalText(raw: unknown, label: string, maxLength: number): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") throw new UserError(`${label} is not valid`);
  const text = raw.trim();
  if (text === "") return null;
  if (text.length > maxLength) throw new UserError(`${label} must be at most ${maxLength} characters`);
  return text;
}

function requireDate(raw: unknown, label: string): string {
  if (typeof raw === "string" && DATE_PATTERN.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00Z`);
    // Date rolls 2026-02-31 over to 1 Mar, so only a date that survives the round trip is real.
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === raw) return raw;
  }
  throw new UserError(`${label} must be a valid date`);
}

/** Trip-day fields (plan day, expense date) must fall inside the trip's own dates. */
async function requireDayInTrip(tripId: string, day: string, label: string): Promise<void> {
  const [trip] = await db
    .select({ startDate: trips.startDate, endDate: trips.endDate })
    .from(trips)
    .where(eq(trips.id, tripId))
    .limit(1);
  if (!trip) throw new UserError("This trip no longer exists");
  if (day < trip.startDate || day > trip.endDate) {
    throw new UserError(`${label} must fall within the trip dates (${trip.startDate} to ${trip.endDate})`);
  }
}

/** Turns known Postgres constraint failures into UserErrors; anything else propagates untouched. */
async function withFriendlyErrors<T>(work: () => Promise<T>, uniqueMessage?: string): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw toUserError(error, uniqueMessage) ?? error;
  }
}

function cleanUpi(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") throw new UserError("That UPI id does not look right (expected name@bank)");
  const upi = raw.trim();
  if (upi === "") return null;
  if (!UPI_PATTERN.test(upi)) throw new UserError("That UPI id does not look right (expected name@bank)");
  return upi;
}

function memberRows(tripId: string, inputs: NewMember[], existingCount: number): Member[] {
  const base = Date.now();
  return inputs.map((input, index) => ({
    id: newId(),
    tripId,
    name: requireText(input.name, "Name", 40),
    upiId: cleanUpi(input.upiId),
    color: MEMBER_COLORS[(existingCount + index) % MEMBER_COLORS.length],
    // Distinct timestamps keep the join order stable when many rows share one insert.
    createdAt: new Date(base + index),
  }));
}

async function assertNameFree(tripId: string, name: string, exceptMemberId?: string) {
  const clash = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.tripId, tripId), sql`lower(${members.name}) = lower(${name})`));
  if (clash.some((row) => row.id !== exceptMemberId)) {
    throw new UserError(`Someone called ${name} is already on this trip`);
  }
}

// ---------- trips and members ----------

function slugFromName(name: string): string {
  const stem =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20)
      .replace(/-+$/, "") || "trip";
  // No 0/1/i/l/o so slugs survive being read out loud or retyped from WhatsApp.
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const suffix = Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => alphabet[b % alphabet.length]).join("");
  return `${stem}-${suffix}`;
}

export async function getTripBySlug(slug: string): Promise<TripWithMembers | null> {
  const [trip] = await db.select().from(trips).where(eq(trips.slug, slug)).limit(1);
  if (!trip) return null;
  const tripMembers = await db
    .select()
    .from(members)
    .where(eq(members.tripId, trip.id))
    .orderBy(asc(members.createdAt), asc(members.name));
  return { ...trip, members: tripMembers };
}

/** Creates a trip with its members; returns the slug plus the members (in input order, minus duplicates). */
export async function createTrip(input: NewTrip): Promise<{ slug: string; tripId: string; members: Member[] }> {
  const name = requireText(input.name, "Trip name", 80);
  const baseLocation = requireText(input.baseLocation, "Base location", 80);
  const startDate = requireDate(input.startDate, "Start date");
  const endDate = requireDate(input.endDate, "End date");
  if (endDate < startDate) throw new UserError("End date cannot be before the start date");

  const seen = new Set<string>();
  const uniqueInputs = input.members
    .filter((m) => m.name.trim() !== "")
    .filter((m) => {
      const key = m.name.replace(/\s+/g, " ").trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (uniqueInputs.length === 0) throw new UserError("Add at least one person to the trip");

  const tripId = newId();
  const slug = input.slug ?? slugFromName(name);
  const memberValues = memberRows(tripId, uniqueInputs, 0);

  await withFriendlyErrors(
    () =>
      runAtomically((client) => [
        client.insert(trips).values({ id: tripId, slug, name, baseLocation, startDate, endDate }),
        client.insert(members).values(memberValues),
      ]),
    "That trip link or one of those names is already taken",
  );
  return { slug, tripId, members: memberValues };
}

export async function addMember(tripId: string, input: NewMember): Promise<Member> {
  const existing = await db.select({ id: members.id }).from(members).where(eq(members.tripId, tripId));
  const [row] = memberRows(tripId, [input], existing.length);
  await assertNameFree(tripId, row.name);
  // The unique index also catches a duplicate that slipped in after the check above.
  await withFriendlyErrors(() => db.insert(members).values(row), `Someone called ${row.name} is already on this trip`);
  return row;
}

/** `upiId: undefined` leaves it unchanged; null or empty string clears it. */
export async function updateMember(
  memberId: string,
  changes: { name?: string; upiId?: string | null },
): Promise<Member> {
  const [current] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!current) throw new UserError("That person is not on the trip");

  const patch: Partial<Pick<Member, "name" | "upiId">> = {};
  if (changes.name !== undefined) {
    patch.name = requireText(changes.name, "Name", 40);
    await assertNameFree(current.tripId, patch.name, memberId);
  }
  if (changes.upiId !== undefined) patch.upiId = cleanUpi(changes.upiId);
  if (Object.keys(patch).length === 0) return current;

  const [updated] = await withFriendlyErrors(
    () => db.update(members).set(patch).where(eq(members.id, memberId)).returning(),
    `Someone called ${patch.name} is already on this trip`,
  );
  return updated;
}

/** Refuses when the member paid for an expense or is part of any split. */
export async function removeMember(memberId: string): Promise<void> {
  const [paid] = await db.select({ id: expenses.id }).from(expenses).where(eq(expenses.paidBy, memberId)).limit(1);
  const [shared] = await db
    .select({ id: expenseSplits.expenseId })
    .from(expenseSplits)
    .where(eq(expenseSplits.memberId, memberId))
    .limit(1);
  if (paid || shared) {
    throw new UserError("This person is part of some expenses, so they cannot be removed");
  }
  await db.delete(members).where(eq(members.id, memberId));
}

// ---------- plan ----------

export async function getPlanItems(tripId: string): Promise<PlanItemWithReactions[]> {
  const items = await db.select().from(planItems).where(eq(planItems.tripId, tripId));
  const reactionRows = await db
    .select({ planItemId: votes.planItemId, memberId: votes.memberId, vote: votes.vote, emoji: votes.emoji })
    .from(votes)
    .innerJoin(planItems, eq(votes.planItemId, planItems.id))
    .where(eq(planItems.tripId, tripId))
    .orderBy(asc(votes.memberId));

  // Map.groupBy needs Node 22; the app supports Node 20.9+.
  const byItem = new Map<string, typeof reactionRows>();
  for (const row of reactionRows) {
    const rows = byItem.get(row.planItemId);
    if (rows) rows.push(row);
    else byItem.set(row.planItemId, [row]);
  }
  return items
    .map((item): PlanItemWithReactions => {
      const rows = byItem.get(item.id) ?? [];
      return {
        ...item,
        upMemberIds: rows.filter((r) => r.vote === "up").map((r) => r.memberId),
        downMemberIds: rows.filter((r) => r.vote === "down").map((r) => r.memberId),
        reactions: EMOJIS.map((emoji) => ({
          emoji,
          memberIds: rows.filter((r) => r.emoji === emoji).map((r) => r.memberId),
        })).filter((reaction) => reaction.memberIds.length > 0),
      };
    })
    .sort(
      (a, b) =>
        a.day.localeCompare(b.day) ||
        // Untimed items last within their day.
        (a.time ?? "99:99").localeCompare(b.time ?? "99:99") ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );
}

export async function addPlanItem(tripId: string, input: NewPlanItem): Promise<PlanItem> {
  const time = optionalText(input.time, "Time", 5);
  if (time !== null && !TIME_PATTERN.test(time)) throw new UserError("Time must look like 14:30");
  const day = requireDate(input.day, "Day");
  await requireDayInTrip(tripId, day, "Day");
  const [row] = await db
    .insert(planItems)
    .values({
      id: newId(),
      tripId,
      day,
      time,
      title: requireText(input.title, "Place", 120),
      notes: optionalText(input.notes, "Notes", 500),
      kind: input.kind ?? "plan",
      createdBy: input.createdBy ?? null,
    })
    .returning();
  return row;
}

export async function deletePlanItem(itemId: string): Promise<void> {
  await db.delete(planItems).where(eq(planItems.id, itemId));
}

/** Turns an option into a confirmed plan; no-op for items that are already plans. */
export async function lockInOption(itemId: string): Promise<void> {
  await db
    .update(planItems)
    .set({ kind: "plan" })
    .where(and(eq(planItems.id, itemId), eq(planItems.kind, "option")));
}

// A reaction row holds one vote and one emoji; changing one must not disturb the other,
// and the row disappears once both are empty.
async function setReaction(
  itemId: string,
  memberId: string,
  patch: { vote: Vote | null } | { emoji: Emoji | null },
) {
  await db
    .insert(votes)
    .values({ planItemId: itemId, memberId, vote: null, emoji: null, ...patch })
    .onConflictDoUpdate({ target: [votes.planItemId, votes.memberId], set: patch });
  await db
    .delete(votes)
    .where(and(eq(votes.planItemId, itemId), eq(votes.memberId, memberId), isNull(votes.vote), isNull(votes.emoji)));
}

/** Pass null to clear the member's vote. */
export async function setVote(itemId: string, memberId: string, vote: Vote | null): Promise<void> {
  if (vote !== null && !VOTES.includes(vote)) throw new UserError("Unknown vote");
  await setReaction(itemId, memberId, { vote });
}

/** Pass null to clear the member's emoji reaction. */
export async function setEmoji(itemId: string, memberId: string, emoji: Emoji | null): Promise<void> {
  if (emoji !== null && !EMOJIS.includes(emoji)) throw new UserError("Unknown reaction");
  await setReaction(itemId, memberId, { emoji });
}

// ---------- expenses ----------

/** Newest day first, undated last; ties by creation time, newest first. */
export async function getExpenses(tripId: string): Promise<ExpenseWithSplits[]> {
  const rows = await db
    .select()
    .from(expenses)
    .where(eq(expenses.tripId, tripId))
    .orderBy(sql`${expenses.day} desc nulls last`, desc(expenses.createdAt));
  const splitsByExpense = await loadSplitsForTrip(tripId);
  return rows.map((row) => ({ ...row, splits: splitsByExpense.get(row.id) ?? [] }));
}

async function loadSplitsForTrip(tripId: string): Promise<Map<string, SplitInput[]>> {
  const rows = await db
    .select({ expenseId: expenseSplits.expenseId, memberId: expenseSplits.memberId, weight: expenseSplits.weight })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
    .where(eq(expenses.tripId, tripId))
    .orderBy(asc(expenseSplits.memberId));
  const grouped = new Map<string, SplitInput[]>();
  for (const row of rows) {
    grouped.set(row.expenseId, [...(grouped.get(row.expenseId) ?? []), { memberId: row.memberId, weight: row.weight }]);
  }
  return grouped;
}

export async function getExpense(expenseId: string): Promise<ExpenseWithSplits | null> {
  const [row] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
  if (!row) return null;
  const rows = await db
    .select()
    .from(expenseSplits)
    .where(eq(expenseSplits.expenseId, expenseId))
    .orderBy(asc(expenseSplits.memberId));
  return { ...row, splits: rows.map((s) => ({ memberId: s.memberId, weight: s.weight })) };
}

/**
 * Narrows an untrusted expense (it arrives from a server action) to ExpenseInput, turning
 * anything malformed into a UserError instead of a TypeError further down.
 */
export function parseExpenseInput(raw: unknown): ExpenseInput {
  if (!isRecord(raw)) throw new UserError("That expense could not be read - refresh and try again");
  const { description, category, amountPaise, paidBy, splitMode, day, splits } = raw;

  if (typeof description !== "string") throw new UserError("Add a short description");
  if (!isOneOf(CATEGORIES, category)) throw new UserError("Pick a category");
  if (!isOneOf(SPLIT_MODES, splitMode)) throw new UserError("Pick how to split: equally, exact amounts or shares");
  if (typeof paidBy !== "string") throw new UserError("Choose who paid");
  if (day !== null && day !== undefined && typeof day !== "string") throw new UserError("Date must be a valid date");
  if (!Array.isArray(splits)) throw new UserError("Pick at least one person to split with");

  return {
    description,
    category,
    // Non-numbers become NaN so validateSplit reports them with its usual amount message.
    amountPaise: typeof amountPaise === "number" ? amountPaise : Number.NaN,
    paidBy,
    splitMode,
    day: day ?? null,
    splits: splits.map((entry: unknown) => {
      if (!isRecord(entry) || typeof entry.memberId !== "string") {
        throw new UserError("Split includes someone who is not on this trip");
      }
      return { memberId: entry.memberId, weight: typeof entry.weight === "number" ? entry.weight : Number.NaN };
    }),
  };
}

/** Checks everything about an expense against the trip and returns the cleaned values to store. */
async function validateExpense(tripId: string, rawInput: unknown): Promise<ExpenseInput> {
  const input = parseExpenseInput(rawInput);
  const description = requireText(input.description, "Description", 120);
  const day = input.day === null ? null : requireDate(input.day, "Date");
  if (day !== null) await requireDayInTrip(tripId, day, "Date");

  // Equal splits ignore weights; store 1 so the data matches its documented meaning.
  const splits = input.splits.map((s) => ({
    memberId: s.memberId,
    weight: input.splitMode === "equal" ? 1 : s.weight,
  }));
  const problem = validateSplit({ amountPaise: input.amountPaise, mode: input.splitMode, splits });
  if (problem) throw new SplitError(problem);

  const tripMembers = await db.select({ id: members.id }).from(members).where(eq(members.tripId, tripId));
  const known = new Set(tripMembers.map((m) => m.id));
  if (!known.has(input.paidBy)) throw new UserError("Choose who paid");
  if (splits.some((s) => !known.has(s.memberId))) throw new UserError("Split includes someone who is not on this trip");

  return { ...input, description, day, splits };
}

function expenseColumns(clean: ExpenseInput) {
  return {
    description: clean.description,
    category: clean.category,
    amountPaise: clean.amountPaise,
    paidBy: clean.paidBy,
    splitMode: clean.splitMode,
    day: clean.day,
  };
}

export async function createExpense(tripId: string, input: ExpenseInput): Promise<ExpenseWithSplits> {
  const clean = await validateExpense(tripId, input);
  const expenseId = newId();
  await runAtomically((client) => [
    client.insert(expenses).values({ id: expenseId, tripId, ...expenseColumns(clean) }),
    client.insert(expenseSplits).values(clean.splits.map((s) => ({ expenseId, ...s }))),
  ]);
  const created = await getExpense(expenseId);
  if (!created) throw new Error("Expense vanished right after insert");
  return created;
}

export async function updateExpense(expenseId: string, input: ExpenseInput): Promise<ExpenseWithSplits> {
  const [existing] = await db.select({ tripId: expenses.tripId }).from(expenses).where(eq(expenses.id, expenseId)).limit(1);
  if (!existing) throw new UserError("That expense no longer exists");
  const clean = await validateExpense(existing.tripId, input);

  // Replacing the splits and updating the row together: a failure must not leave an expense without splits.
  await runAtomically((client) => [
    client.update(expenses).set(expenseColumns(clean)).where(eq(expenses.id, expenseId)),
    client.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId)),
    client.insert(expenseSplits).values(clean.splits.map((s) => ({ expenseId, ...s }))),
  ]);

  const updated = await getExpense(expenseId);
  if (!updated) throw new UserError("That expense no longer exists");
  return updated;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await db.delete(expenses).where(eq(expenses.id, expenseId));
}
