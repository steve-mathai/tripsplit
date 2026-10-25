import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ExpenseList } from "@/components/expense-list";
import { CardSkeleton } from "@/components/skeletons";
import { getExpenses, getTripBySlug } from "@/db/queries";

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
  const nameOf = new Map(trip.members.map((m) => [m.id, m.name]));

  return (
    <ExpenseList
      slug={trip.slug}
      memberCount={trip.members.length}
      rows={expenses.map((e) => ({
        id: e.id,
        description: e.description,
        category: e.category,
        amountPaise: e.amountPaise,
        paidByName: nameOf.get(e.paidBy) ?? "Someone",
        splitCount: e.splits.length,
        day: e.day,
      }))}
    />
  );
}
