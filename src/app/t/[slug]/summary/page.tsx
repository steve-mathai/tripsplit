import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { BulletRows, DayColumns, RingChart } from "@/components/bars";
import { CATEGORY_META } from "@/components/categories";
import { formatDayShort, tripDays } from "@/components/dates";
import { CardSkeleton } from "@/components/skeletons";
import { getExpenses, getTripBySlug } from "@/db/queries";
import { formatINR } from "@/lib/money";
import { summarize } from "@/lib/summary";
import { CATEGORIES } from "@/lib/types";
import { toMathsExpenses } from "../maths-input";

export const metadata = { title: "Summary" };

export default function SummaryPage({ params }: PageProps<"/t/[slug]/summary">) {
  return (
    <Suspense fallback={<CardSkeleton count={4} height="h-32" />}>
      <SummaryContent params={params} />
    </Suspense>
  );
}

/** "42%"; a non-zero share under half a percent reads "<1%" so it is not shown as nothing. */
function shareText(value: number, total: number): string {
  if (total <= 0 || value <= 0) return "0%";
  const percent = (value / total) * 100;
  return percent < 0.5 ? "<1%" : `${Math.round(percent)}%`;
}

async function SummaryContent({ params }: { params: PageProps<"/t/[slug]/summary">["params"] }) {
  await connection();
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip) notFound();
  const expenses = await getExpenses(trip.id);
  const summary = summarize(trip.members, toMathsExpenses(expenses));
  const memberById = new Map(trip.members.map((m) => [m.id, m]));
  const dayCount = tripDays(trip.startDate, trip.endDate).length;

  // Largest first for the ring and the table; ties keep the fixed category order (sort is stable).
  const categories = CATEGORIES.map((key) => ({ key, ...CATEGORY_META[key], value: summary.byCategory[key] })).sort((a, b) => b.value - a.value);
  const topCategory = categories[0];
  const ringDescription =
    summary.totalPaise > 0
      ? `Spend by category: ${categories.map((c) => `${c.label} ${shareText(c.value, summary.totalPaise)}`).join(", ")}`
      : "Spend by category: no spend yet";

  const people = summary.perPerson
    .map((p) => ({ ...p, member: memberById.get(p.memberId)! }))
    .sort((a, b) => b.sharePaise - a.sharePaise || a.member.name.localeCompare(b.member.name));

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <p className="text-sm text-muted">Total spent</p>
        <p className="num text-lead">{formatINR(summary.totalPaise)}</p>
        <p className="num mt-1 text-sm text-muted">
          {formatINR(summary.averagePerHeadPaise)} a head · {summary.expenseCount} {summary.expenseCount === 1 ? "expense" : "expenses"} · {dayCount}{" "}
          {dayCount === 1 ? "day" : "days"}
        </p>
      </section>

      <div className="wide-2col lg:items-start">
        <div className="space-y-4">
          <section className="card p-4">
            <h2 className="mb-4 text-section">Where the money went</h2>
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <RingChart
                description={ringDescription}
                segments={categories.map((c) => ({ key: c.key, value: c.value, color: c.chart }))}
                centre={
                  topCategory.value > 0 && (
                    <>
                      <span className="num text-section">{shareText(topCategory.value, summary.totalPaise)}</span>
                      <span className="text-meta text-muted">{topCategory.label}</span>
                    </>
                  )
                }
              />
              <table className="w-full min-w-0 text-sm">
                <thead>
                  <tr className="text-meta text-muted">
                    <th scope="col" className="pb-2 text-left font-normal">
                      Category
                    </th>
                    <th scope="col" className="pb-2 text-right font-normal">
                      Amount
                    </th>
                    <th scope="col" className="w-14 pb-2 text-right font-normal">
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule border-t border-rule">
                  {categories.map((c) => (
                    <tr key={c.key}>
                      <th scope="row" className="py-2.5 text-left font-normal">
                        <span className="flex min-w-0 items-center gap-2">
                          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.chart }} />
                          <span className="truncate">{c.label}</span>
                        </span>
                      </th>
                      <td className="num py-2.5 text-right font-semibold">{formatINR(c.value)}</td>
                      <td className="num py-2.5 text-right text-muted">{shareText(c.value, summary.totalPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card p-4">
            <h2 className="mb-4 text-section">Per day</h2>
            {summary.perDay.length === 0 ? (
              <p className="text-sm text-muted">No expenses yet.</p>
            ) : (
              <DayColumns
                days={summary.perDay.map((d) => ({
                  key: d.day ?? "undated",
                  // "Fri 30 Oct" -> "Fri 30": the card title already says these are days.
                  label: d.day ? formatDayShort(d.day).split(" ").slice(0, 2).join(" ") : "No day",
                  valuePaise: d.totalPaise,
                }))}
              />
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="card p-4">
            <h2 className="text-section">Per person</h2>
            <p className="mb-4 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2 w-4 rounded-full bg-accent" />
                Share of spend
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-4 w-0.5 bg-text" />
                What they paid
              </span>
            </p>
            <BulletRows
              rows={people.map((p) => ({
                key: p.memberId,
                name: p.member.name,
                sharePaise: p.sharePaise,
                paidPaise: p.paidPaise,
                label: (
                  <>
                    <Avatar name={p.member.name} color={p.member.color} size="sm" />
                    <span className="truncate">{p.member.name}</span>
                  </>
                ),
              }))}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
