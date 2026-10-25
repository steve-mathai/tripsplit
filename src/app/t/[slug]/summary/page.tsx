import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { BarRows, Donut } from "@/components/bars";
import { CATEGORY_META } from "@/components/categories";
import { formatDayShort } from "@/components/dates";
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

async function SummaryContent({ params }: { params: PageProps<"/t/[slug]/summary">["params"] }) {
  await connection();
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip) notFound();
  const expenses = await getExpenses(trip.id);
  const summary = summarize(trip.members, toMathsExpenses(expenses));
  const memberById = new Map(trip.members.map((m) => [m.id, m]));

  const stats = [
    { label: "Total spend", value: formatINR(summary.totalPaise), tone: "bg-primary-soft text-primary-deep" },
    { label: "Per head", value: formatINR(summary.averagePerHeadPaise), tone: "bg-accent-soft text-accent-deep" },
    { label: "Expenses", value: String(summary.expenseCount), tone: "bg-card-soft text-ink" },
  ];

  const categoryRows = CATEGORIES.map((key) => ({
    key,
    value: summary.byCategory[key],
    color: CATEGORY_META[key].color,
    label: (
      <>
        <span aria-hidden="true">{CATEGORY_META[key].emoji}</span> {CATEGORY_META[key].label}
      </>
    ),
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl p-3 ${s.tone}`}>
            <p className="text-[11px] font-bold uppercase tracking-wide opacity-75">{s.label}</p>
            <p className="mt-1 font-display text-xl font-semibold leading-tight tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="card p-4">
        <h2 className="mb-4 font-display text-lg font-semibold">Where the money went</h2>
        <Donut
          segments={categoryRows.map((r) => ({ key: r.key, value: r.value, color: r.color }))}
          centre={
            <>
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Total</span>
              <span className="font-display text-xl font-semibold tabular-nums">{formatINR(summary.totalPaise)}</span>
            </>
          }
        />
        <div className="mt-5">
          <BarRows
            rows={categoryRows.map((r) => ({
              ...r,
              valueLabel: `${formatINR(r.value)} · ${summary.totalPaise ? Math.round((r.value / summary.totalPaise) * 100) : 0}%`,
            }))}
          />
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-display text-lg font-semibold">Per person</h2>
        <p className="mb-4 text-sm text-muted">
          Bar is the share each person consumed. The <span className="font-bold text-accent-deep">saffron tick</span> marks what they paid out of pocket.
        </p>
        <BarRows
          rows={summary.perPerson.map((p) => {
            const m = memberById.get(p.memberId)!;
            return {
              key: p.memberId,
              value: p.sharePaise,
              marker: p.paidPaise,
              color: m.color,
              note: p.paidPaise > 0 ? `Paid ${formatINR(p.paidPaise)}` : undefined,
              label: (
                <>
                  <Avatar name={m.name} color={m.color} size="sm" />
                  <span className="truncate">{m.name}</span>
                </>
              ),
            };
          })}
        />
      </section>

      <section className="card p-4">
        <h2 className="mb-4 font-display text-lg font-semibold">Per day</h2>
        {summary.perDay.length === 0 ? (
          <p className="text-sm text-muted">No expenses yet.</p>
        ) : (
          <BarRows
            rows={summary.perDay.map((d) => ({
              key: d.day ?? "undated",
              value: d.totalPaise,
              color: "var(--primary)",
              label: d.day ? formatDayShort(d.day) : "No specific day",
            }))}
          />
        )}
      </section>
    </div>
  );
}
