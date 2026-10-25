import { notFound } from "next/navigation";
import { connection } from "next/server";
import { tripDays } from "@/components/dates";
import { ExpenseForm, type ExpenseFormInitial } from "@/components/expense-form";
import { getExpense, getTripBySlug } from "@/db/queries";
import { getCurrentMemberId } from "../identity";

/** Today in India (UTC+5:30), as YYYY-MM-DD; trips are planned in IST whatever the server clock says. */
function todayInIndia(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Loads the trip (and the expense when editing) and renders the form. Must sit under <Suspense>. */
export async function ExpenseFormLoader({
  params,
  expenseId,
}: {
  params: Promise<{ slug: string }>;
  expenseId?: Promise<string>;
}) {
  await connection();
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip) notFound();

  let initial: ExpenseFormInitial | undefined;
  if (expenseId) {
    const expense = await getExpense(await expenseId);
    if (!expense || expense.tripId !== trip.id) notFound();
    initial = {
      id: expense.id,
      description: expense.description,
      amountPaise: expense.amountPaise,
      category: expense.category,
      paidBy: expense.paidBy,
      day: expense.day,
      mode: expense.splitMode,
      splits: expense.splits,
    };
  }

  const days = tripDays(trip.startDate, trip.endDate);
  // An edited expense may sit on a date outside the trip; keep it selectable.
  if (initial?.day && !days.includes(initial.day)) days.push(initial.day);
  const today = todayInIndia();
  const currentMemberId = await getCurrentMemberId(trip);

  return (
    <ExpenseForm
      slug={trip.slug}
      members={trip.members.map((m) => ({ id: m.id, name: m.name, color: m.color }))}
      days={days}
      defaultPaidBy={currentMemberId ?? trip.members[0]?.id ?? ""}
      defaultDay={days.includes(today) ? today : days[0]}
      initial={initial}
    />
  );
}
