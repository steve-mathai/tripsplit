import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AddPlanForm } from "@/components/add-plan-form";
import { formatDayShort, tripDays } from "@/components/dates";
import { PlanItemCard } from "@/components/plan-item";
import { CardSkeleton } from "@/components/skeletons";
import { getPlanItems, getTripBySlug } from "@/db/queries";

export default function PlanPage({ params }: PageProps<"/t/[slug]">) {
  return (
    <Suspense fallback={<CardSkeleton count={4} height="h-28" />}>
      <PlanDays params={params} />
    </Suspense>
  );
}

async function PlanDays({ params }: { params: PageProps<"/t/[slug]">["params"] }) {
  await connection();
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip) notFound();
  const items = await getPlanItems(trip.id);

  const memberNames = Object.fromEntries(trip.members.map((m) => [m.id, m.name]));
  const scheduleDays = tripDays(trip.startDate, trip.endDate);
  // Anything planned outside the trip dates still shows up, after the regular days.
  const strayDays = [...new Set(items.map((item) => item.day))].filter((d) => !scheduleDays.includes(d)).sort();

  return (
    <div className="space-y-7">
      {[...scheduleDays, ...strayDays].map((day, index) => {
        const dayItems = items.filter((item) => item.day === day);
        const outside = index >= scheduleDays.length;
        return (
          <section key={day} aria-labelledby={`day-${day}`}>
            <h2 id={`day-${day}`} className="mb-3 flex items-baseline gap-2 font-display text-xl font-semibold">
              {outside ? "Outside the trip" : `Day ${index + 1}`}
              <span className="text-sm font-medium text-muted">· {formatDayShort(day)}</span>
            </h2>
            <ul className="mb-3 space-y-3">
              {dayItems.map((item) => (
                <PlanItemCard
                  key={item.id}
                  slug={trip.slug}
                  memberNames={memberNames}
                  item={{
                    id: item.id,
                    time: item.time,
                    title: item.title,
                    notes: item.notes,
                    kind: item.kind,
                    upMemberIds: item.upMemberIds,
                    downMemberIds: item.downMemberIds,
                    reactions: item.reactions,
                  }}
                />
              ))}
            </ul>
            {dayItems.length === 0 && <p className="mb-3 text-sm text-muted">Nothing planned yet. Add the first thing.</p>}
            <AddPlanForm slug={trip.slug} day={day} />
          </section>
        );
      })}
    </div>
  );
}
