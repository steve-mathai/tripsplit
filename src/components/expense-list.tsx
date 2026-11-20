"use client";

import Link from "next/link";
import { useState } from "react";
import { formatINR } from "@/lib/money";
import { CATEGORIES, type Category } from "@/lib/types";
import { Avatar } from "./avatar";
import { CATEGORY_META } from "./categories";
import { formatDayShort } from "./dates";
import { PlusIcon } from "./icons";

export interface ExpenseRow {
  id: string;
  description: string;
  category: Category;
  amountPaise: number;
  paidByName: string;
  paidByColor: string;
  splitCount: number;
  day: string | null;
}

/** Whole percent of the total; a non-zero share that rounds to 0 reads "<1%" so it is never shown as nothing. */
function formatShare(amountPaise: number, totalPaise: number): string {
  if (totalPaise === 0) return "0%";
  const percent = Math.round((amountPaise / totalPaise) * 100);
  return amountPaise > 0 && percent === 0 ? "<1%" : `${percent}%`;
}

export function ExpenseList({ slug, rows, memberCount }: { slug: string; rows: ExpenseRow[]; memberCount: number }) {
  const [filter, setFilter] = useState<Category | "all">("all");
  const visible = filter === "all" ? rows : rows.filter((r) => r.category === filter);
  const total = visible.reduce((sum, r) => sum + r.amountPaise, 0);
  const perHead = memberCount > 0 ? formatINR(Math.round(total / memberCount)) : null;

  // The breakdown always covers every expense, so the bar and legend stay put while a filter narrows the list.
  const tripTotal = rows.reduce((sum, r) => sum + r.amountPaise, 0);
  const breakdown = CATEGORIES.map((key) => ({
    key,
    amountPaise: rows.filter((r) => r.category === key).reduce((sum, r) => sum + r.amountPaise, 0),
  })).sort((a, b) => b.amountPaise - a.amountPaise);
  const breakdownSummary = breakdown
    .map((b) => `${CATEGORY_META[b.key].label} ${formatINR(b.amountPaise)}, ${formatShare(b.amountPaise, tripTotal)}`)
    .join("; ");

  // Rows arrive newest day first, undated last; keep that order while grouping.
  const groups: { day: string | null; rows: ExpenseRow[] }[] = [];
  for (const row of visible) {
    const last = groups[groups.length - 1];
    if (last && last.day === row.day) last.rows.push(row);
    else groups.push({ day: row.day, rows: [row] });
  }

  return (
    <div className="wide-2col-aside">
      <div className="space-y-4 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
        <section className="card p-4" aria-label="Spending summary">
          <p className="text-sm text-muted">{filter === "all" ? "Total spent" : `${CATEGORY_META[filter].label} spend`}</p>
          <div aria-live="polite">
            <p className="text-lead num whitespace-nowrap">{formatINR(total)}</p>
            <p className="mt-1 text-sm text-muted">
              <span className="num">{visible.length}</span> {visible.length === 1 ? "expense" : "expenses"}
              {perHead && (
                <>
                  {" · "}
                  <span className="num">{perHead}</span> a head
                </>
              )}
            </p>
          </div>

          {/* Segments grow in proportion to their amount; the 2px gap is the seam between categories. */}
          <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-active" role="img" aria-label={breakdownSummary}>
            {breakdown
              .filter((b) => b.amountPaise > 0)
              .map((b) => (
                <span
                  key={b.key}
                  className="min-w-1"
                  style={{ flex: `${b.amountPaise} 1 0%`, backgroundColor: CATEGORY_META[b.key].chart }}
                />
              ))}
          </div>

          <ul className="mt-3 space-y-1">
            {breakdown.map((b) => (
              <li key={b.key} className="flex min-h-8 items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORY_META[b.key].chart }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{CATEGORY_META[b.key].label}</span>
                <span className="num shrink-0 whitespace-nowrap font-medium">{formatINR(b.amountPaise)}</span>
                <span className="num w-10 shrink-0 text-right text-muted">{formatShare(b.amountPaise, tripTotal)}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="chip-row -mx-4 flex gap-2 px-4 lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="Filter by category">
          <button type="button" className="chip shrink-0" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            All
          </button>
          {CATEGORIES.map((key) => {
            const { Icon, label } = CATEGORY_META[key];
            return (
              <button key={key} type="button" className="chip shrink-0" aria-pressed={filter === key} onClick={() => setFilter(key)}>
                <Icon width={18} height={18} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <section aria-labelledby="expenses-heading" className="lg:col-start-1 lg:row-start-1">
        {/* Sticky under the top of the screen so the main job is one tap away without covering any row. */}
        <div className="sticky-bar flex items-center justify-between gap-3 py-2">
          <h2 id="expenses-heading" className="min-w-0 truncate text-section">
            {filter === "all" ? "All expenses" : `${CATEGORY_META[filter].label} expenses`}
          </h2>
          <Link href={`/t/${slug}/expenses/new`} className="btn-primary shrink-0">
            <PlusIcon width={18} height={18} aria-hidden="true" />
            Add expense
          </Link>
        </div>

        {groups.length === 0 && (
          <div className="card mt-2 p-6 text-center text-sm text-muted">
            {rows.length === 0
              ? "No expenses yet. Add the first one and the maths takes care of itself."
              : `No ${CATEGORY_META[filter as Category].label.toLowerCase()} expenses yet.`}
          </div>
        )}

        <div className="mt-2 space-y-4">
          {groups.map((group) => (
            <section key={group.day ?? "undated"}>
              <h3 className="mb-2 flex items-baseline justify-between gap-3 text-sm font-semibold">
                <span>{group.day ? formatDayShort(group.day) : "No specific day"}</span>
                <span className="num shrink-0 whitespace-nowrap font-medium text-muted">
                  {formatINR(group.rows.reduce((sum, r) => sum + r.amountPaise, 0))}
                </span>
              </h3>
              <ul className="card divide-y divide-rule overflow-hidden">
                {group.rows.map((row) => {
                  const { Icon, label, tint, ink } = CATEGORY_META[row.category];
                  return (
                    <li key={row.id}>
                      <Link
                        href={`/t/${slug}/expenses/${row.id}`}
                        className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-raised active:bg-raised"
                      >
                        <Avatar name={row.paidByName} color={row.paidByColor} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            {/* Two lines, then clamp: the description says what the money was for, so it should not be cut at one line. */}
                            <span className="line-clamp-2 min-w-0 text-base font-medium [overflow-wrap:anywhere]" title={row.description}>
                              {row.description}
                            </span>
                            <span className="num shrink-0 whitespace-nowrap text-right text-base font-semibold">{formatINR(row.amountPaise)}</span>
                          </span>
                          <span className="mt-1 flex items-center gap-2 text-sm text-muted">
                            <span className="pill shrink-0" style={{ backgroundColor: tint, color: ink }}>
                              <Icon width={12} height={12} aria-hidden="true" />
                              {label}
                            </span>
                            <span className="min-w-0 truncate" title={row.paidByName}>Paid by {row.paidByName}</span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
