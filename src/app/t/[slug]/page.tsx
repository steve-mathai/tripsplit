import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AddPlanForm } from "@/components/add-plan-form";
import { formatDayShort, formatTime12, tripDays } from "@/components/dates";
import { PlanItemCard } from "@/components/plan-item";
import { CardSkeleton } from "@/components/skeletons";
import { getPlanItems, getTripBySlug } from "@/db/queries";

type PlanItems = Awaited<ReturnType<typeof getPlanItems>>;

/** Consecutive timed options at the same time are alternatives for one slot; everything else stays on its own. */
function groupOptions(dayItems: PlanItems): PlanItems[] {
  const blocks: PlanItems[] = [];
  for (const item of dayItems) {
    const last = blocks[blocks.length - 1];
    const joins = item.kind === "option" && item.time !== null && last?.[0].kind === "option" && last[0].time === item.time;
    if (joins) last.push(item);
    else blocks.push([item]);
  }
  return blocks;
}

/** "Fri 30 Oct" -> "Fri 30", for the jump chips. */
function formatDayChip(day: string): string {
  return formatDayShort(day).split(" ").slice(0, 2).join(" ");
}

/** "6 plans, 1 vote open" */
function daySummary(planCount: number, openVotes: number): string {
  const parts: string[] = [];
  if (planCount > 0) parts.push(`${planCount} ${planCount === 1 ? "plan" : "plans"}`);
  if (openVotes > 0) parts.push(`${openVotes} ${openVotes === 1 ? "vote" : "votes"} open`);
  return parts.length > 0 ? parts.join(", ") : "No plans yet";
}

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
  const card = (item: PlanItems[number], rivalYes: number | null) => (
    <PlanItemCard
      key={item.id}
      slug={trip.slug}
      memberNames={memberNames}
      memberCount={trip.members.length}
      rivalYes={rivalYes}
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
  );
  const scheduleDays = tripDays(trip.startDate, trip.endDate);
  // Anything planned outside the trip dates still shows up, after the regular days.
  const strayDays = [...new Set(items.map((item) => item.day))].filter((d) => !scheduleDays.includes(d)).sort();
  const allDays = [...scheduleDays, ...strayDays];

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,760px)_15rem] lg:items-start lg:gap-10">
      {allDays.length > 1 && (
        <nav aria-label="Jump to a day" className="mb-4 lg:sticky lg:top-6 lg:order-2 lg:mb-0">
          <p className="label hidden lg:block">Jump to a day</p>
          {/* py-1 keeps the focus ring inside the scroller, which clips on both axes. */}
          <ul className="chip-row -mx-4 flex gap-2 px-4 py-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:py-0">
            {allDays.map((day, index) => (
              <li key={day} className="shrink-0">
                <a href={`#day-${day}`} className="chip lg:w-full lg:justify-between">
                  <span className="num hidden text-muted lg:inline">{index < scheduleDays.length ? `Day ${index + 1}` : "Outside"}</span>
                  <span className="num">{formatDayChip(day)}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="space-y-6 lg:order-1">
        {allDays.map((day, index) => {
          const dayItems = items.filter((item) => item.day === day);
          const outside = index >= scheduleDays.length;
          const blocks = groupOptions(dayItems);
          const openVotes = blocks.filter((block) => block[0].kind === "option").length;
          const planCount = dayItems.filter((item) => item.kind !== "option").length;
          const dayLabel = outside ? "Outside the trip" : `Day ${index + 1}`;
          return (
            <section key={day} aria-labelledby={`day-${day}`}>
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <h2 id={`day-${day}`} className="scroll-mt-4 text-section">
                  {dayLabel} · {formatDayShort(day)}
                </h2>
                <p className="num text-sm text-muted">{daySummary(planCount, openVotes)}</p>
              </div>
              <div className="card">
                {dayItems.length === 0 && <p className="px-4 py-3 text-sm text-muted">Nothing here yet. Add the first thing.</p>}
                {dayItems.length > 0 && (
                  <ul className="divide-y divide-rule">
                    {blocks.map((block) => {
                      if (block[0].kind !== "option") return card(block[0], null);
                      const slot = block[0].time ? formatTime12(block[0].time) : "Any time";
                      return (
                        <li key={block[0].id} className="p-3">
                          <div className="panel p-3">
                            <div className="flex items-baseline justify-between gap-2">
                              <h3 className="text-sm font-semibold">Vote · {slot}</h3>
                              <p className="num shrink-0 text-sm text-muted">
                                {block.length} {block.length === 1 ? "option" : "options"}
                              </p>
                            </div>
                            <ul className="mt-3 divide-y divide-border">
                              {block.map((item) =>
                                card(
                                  item,
                                  block.length > 1
                                    ? Math.max(...block.filter((other) => other.id !== item.id).map((other) => other.upMemberIds.length))
                                    : null,
                                ),
                              )}
                            </ul>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <AddPlanForm slug={trip.slug} day={day} dayLabel={outside ? "this day" : dayLabel} />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
