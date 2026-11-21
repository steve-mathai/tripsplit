import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { tripDays } from "@/components/dates";
import { ExpenseList } from "@/components/expense-list";
import { QuickAdd } from "@/components/quick-add";
import { CardSkeleton } from "@/components/skeletons";
import { getExpenses, getTripBySlug } from "@/db/queries";
import { todayInIndia } from "./expense-form-loader";

export const metadata = { title: "Expenses" };

export default function ExpensesPage({ params }: PageProps<"/t/[slug]/expenses">) {
  return (
    <Suspense fallback={<CardSkeleton count={5} height="h-16" />}>
      <ExpensesContent params={params} />
    </Suspense>
  );
}

async function ExpensesContent({ params }: { params: PageProps<"/t/[slug]/expenses">["params"] }) {
  await connection();
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip) notFound();
  const expenses = await getExpenses(trip.id);
  const memberOf = new Map(trip.members.map((m) => [m.id, m]));

  // Same default as the full form: today when it falls inside the trip, else the first day.
  const days = tripDays(trip.startDate, trip.endDate);
  const today = todayInIndia();

  return (
    <>
      <QuickAdd
        slug={trip.slug}
        members={trip.members.map((m) => ({ id: m.id, name: m.name, color: m.color }))}
        defaultDay={days.includes(today) ? today : (days[0] ?? null)}
      />
      <ExpenseList
        slug={trip.slug}
        memberCount={trip.members.length}
        rows={expenses.map((e) => ({
          id: e.id,
          description: e.description,
          category: e.category,
          amountPaise: e.amountPaise,
          paidByName: memberOf.get(e.paidBy)?.name ?? "Someone",
          paidByColor: memberOf.get(e.paidBy)?.color ?? "",
          splitCount: e.splits.length,
          day: e.day,
        }))}
      />
    </>
  );
}
