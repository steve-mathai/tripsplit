import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PeopleManager } from "@/components/people-manager";
import { CardSkeleton } from "@/components/skeletons";
import { getExpenses, getTripBySlug } from "@/db/queries";
import { getCurrentMemberId } from "../identity";

export const metadata = { title: "People" };

export default function PeoplePage({ params }: PageProps<"/t/[slug]/people">) {
  return (
    <Suspense fallback={<CardSkeleton count={4} height="h-28" />}>
      <PeopleContent params={params} />
    </Suspense>
  );
}

async function PeopleContent({ params }: { params: PageProps<"/t/[slug]/people">["params"] }) {
  await connection();
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip) notFound();
  const expenses = await getExpenses(trip.id);
  const currentMemberId = await getCurrentMemberId(trip);

  // Mirrors the rule in removeMember: anyone who paid or sits in a split is locked in.
  const involved = new Set(expenses.flatMap((e) => [e.paidBy, ...e.splits.map((s) => s.memberId)]));

  return (
    <PeopleManager
      slug={trip.slug}
      currentMemberId={currentMemberId}
      people={trip.members.map((m) => ({
        id: m.id,
        name: m.name,
        color: m.color,
        upiId: m.upiId,
        canRemove: !involved.has(m.id),
      }))}
    />
  );
}
