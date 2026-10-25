"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addMember,
  addPlanItem,
  createExpense,
  createTrip,
  deleteExpense,
  deletePlanItem,
  getExpense,
  getPlanItems,
  getTripBySlug,
  lockInOption,
  parseExpenseInput,
  removeMember,
  setEmoji,
  setVote,
  updateExpense,
  updateMember,
  type TripWithMembers,
} from "@/db/queries";
import type { ActionResult, ExpensePayload } from "@/components/expense-payload";
import { UserError } from "@/lib/errors";
import { isRecord } from "@/lib/guards";
import { toUserError } from "@/lib/pg-errors";
import { getCurrentMemberId, setIdentityCookie } from "./identity";
import { EMOJIS, VOTES, type Emoji, type Vote } from "@/lib/types";

// Server actions are public endpoints: every argument below can be any JSON a client sends,
// whatever its TypeScript type says, so anything reaching the database is checked first.
function requireString(value: unknown, label: string): string {
  if (typeof value !== "string") throw new UserError(`${label} is not valid`);
  return value;
}

async function loadTrip(slug: unknown): Promise<TripWithMembers> {
  const trip = await getTripBySlug(requireString(slug, "Trip link"));
  if (!trip) throw new UserError("This trip no longer exists");
  return trip;
}

function refresh(slug: string) {
  revalidatePath(`/t/${slug}`, "layout");
}

/** The message to show for an error the user can fix (bad input, a database constraint), else null. */
function friendlyMessage(error: unknown): string | null {
  if (error instanceof UserError) return error.message;
  return toUserError(error)?.message ?? null;
}

/** Runs a mutation, turning friendly errors into a result the UI can show. Everything else (including redirects) propagates. */
async function guarded(work: () => Promise<void>): Promise<ActionResult> {
  try {
    await work();
  } catch (error) {
    const message = friendlyMessage(error);
    if (message !== null) return { error: message };
    throw error;
  }
}

// ---------- create trip ----------

export interface CreateTripState {
  error?: string;
  values?: Record<string, string>;
}

export async function createTripAction(_previous: CreateTripState, formData: FormData): Promise<CreateTripState> {
  const field = (key: string) => String(formData.get(key) ?? "");
  const values = Object.fromEntries(
    ["name", "baseLocation", "startDate", "endDate", "yourName", "others"].map((key) => [key, field(key)]),
  );

  let slug: string;
  try {
    const yourName = values.yourName.trim();
    if (!yourName) throw new UserError("Tell us your name so we know who you are");
    const others = values.others.split(/[\n,]+/).map((n) => n.trim()).filter(Boolean);
    const created = await createTrip({
      name: values.name,
      baseLocation: values.baseLocation,
      startDate: values.startDate,
      endDate: values.endDate,
      members: [yourName, ...others].map((name) => ({ name })),
    });
    await setIdentityCookie(created.tripId, created.members[0].id);
    slug = created.slug;
  } catch (error) {
    const message = friendlyMessage(error);
    if (message !== null) return { error: message, values };
    throw error;
  }
  redirect(`/t/${slug}`);
}

// ---------- identity ----------

export async function chooseIdentityAction(slug: string, memberId: string): Promise<ActionResult> {
  return guarded(async () => {
    const trip = await loadTrip(slug);
    if (!trip.members.some((m) => m.id === memberId)) throw new UserError("That person is not on this trip");
    await setIdentityCookie(trip.id, memberId);
    refresh(slug);
  });
}

export async function joinAsNewMemberAction(slug: string, name: string): Promise<ActionResult> {
  return guarded(async () => {
    const trip = await loadTrip(slug);
    const member = await addMember(trip.id, { name });
    await setIdentityCookie(trip.id, member.id);
    refresh(slug);
  });
}

// ---------- plan ----------

export async function voteAction(slug: string, itemId: string, value: Vote | null): Promise<ActionResult> {
  return guarded(async () => {
    if (value !== null && !VOTES.includes(value)) throw new UserError("Unknown vote");
    const trip = await loadTrip(slug);
    const memberId = await getCurrentMemberId(trip);
    if (!memberId) throw new UserError("Pick who you are first");
    await requirePlanItemInTrip(trip.id, itemId);
    await setVote(itemId, memberId, value);
    refresh(slug);
  });
}

export async function reactAction(slug: string, itemId: string, emoji: Emoji | null): Promise<ActionResult> {
  return guarded(async () => {
    if (emoji !== null && !EMOJIS.includes(emoji)) throw new UserError("Unknown reaction");
    const trip = await loadTrip(slug);
    const memberId = await getCurrentMemberId(trip);
    if (!memberId) throw new UserError("Pick who you are first");
    await requirePlanItemInTrip(trip.id, itemId);
    await setEmoji(itemId, memberId, emoji);
    refresh(slug);
  });
}

async function requirePlanItemInTrip(tripId: string, itemId: string) {
  const items = await getPlanItems(tripId);
  if (!items.some((item) => item.id === itemId)) throw new UserError("That plan item no longer exists");
}

export async function lockInAction(slug: string, itemId: string): Promise<ActionResult> {
  return guarded(async () => {
    const trip = await loadTrip(slug);
    await requirePlanItemInTrip(trip.id, itemId);
    await lockInOption(itemId);
    refresh(slug);
  });
}

export async function deletePlanItemAction(slug: string, itemId: string): Promise<ActionResult> {
  return guarded(async () => {
    const trip = await loadTrip(slug);
    await requirePlanItemInTrip(trip.id, itemId);
    await deletePlanItem(itemId);
    refresh(slug);
  });
}

export interface NewPlanItemPayload {
  day: string;
  time: string;
  title: string;
  notes: string;
  isOption: boolean;
}

export async function addPlanItemAction(slug: string, payload: NewPlanItemPayload): Promise<ActionResult> {
  return guarded(async () => {
    const trip = await loadTrip(slug);
    if (!isRecord(payload)) throw new UserError("That plan could not be read - refresh and try again");
    await addPlanItem(trip.id, {
      day: payload.day,
      time: payload.time,
      title: payload.title,
      notes: payload.notes,
      kind: payload.isOption === true ? "option" : "plan",
      createdBy: await getCurrentMemberId(trip),
    });
    refresh(slug);
  });
}

// ---------- expenses ----------

export async function saveExpenseAction(
  slug: string,
  expenseId: string | null,
  payload: ExpensePayload,
): Promise<ActionResult> {
  const result = await guarded(async () => {
    const trip = await loadTrip(slug);
    // The form calls the split mode `mode`; storage calls it `splitMode`.
    const input = parseExpenseInput(isRecord(payload) ? { ...payload, splitMode: payload.mode } : payload);
    if (expenseId) {
      await requireExpenseInTrip(trip.id, expenseId);
      await updateExpense(expenseId, input);
    } else {
      await createExpense(trip.id, input);
    }
    refresh(slug);
  });
  if (result) return result;
  redirect(`/t/${slug}/expenses`);
}

async function requireExpenseInTrip(tripId: string, expenseId: unknown) {
  const expense = await getExpense(requireString(expenseId, "Expense"));
  if (!expense || expense.tripId !== tripId) throw new UserError("That expense no longer exists");
}

export async function deleteExpenseAction(slug: string, expenseId: string): Promise<ActionResult> {
  const result = await guarded(async () => {
    const trip = await loadTrip(slug);
    await requireExpenseInTrip(trip.id, expenseId);
    await deleteExpense(expenseId);
    refresh(slug);
  });
  if (result) return result;
  redirect(`/t/${slug}/expenses`);
}

// ---------- people ----------

async function requireMemberInTrip(trip: TripWithMembers, memberId: string) {
  if (!trip.members.some((m) => m.id === memberId)) throw new UserError("That person is not on this trip");
}

export async function addMemberAction(slug: string, name: string): Promise<ActionResult> {
  return guarded(async () => {
    const trip = await loadTrip(slug);
    await addMember(trip.id, { name });
    refresh(slug);
  });
}

export async function updateUpiAction(slug: string, memberId: string, upiId: string): Promise<ActionResult> {
  return guarded(async () => {
    const trip = await loadTrip(slug);
    await requireMemberInTrip(trip, memberId);
    await updateMember(memberId, { upiId });
    refresh(slug);
  });
}

export async function removeMemberAction(slug: string, memberId: string): Promise<ActionResult> {
  return guarded(async () => {
    const trip = await loadTrip(slug);
    await requireMemberInTrip(trip, memberId);
    await removeMember(memberId);
    refresh(slug);
  });
}
