"use client";

import Link from "next/link";
import { useState } from "react";
import { formatINR } from "@/lib/money";
import { CATEGORIES, type Category } from "@/lib/types";
import { CATEGORY_META } from "./categories";
import { formatDayShort } from "./dates";
import { PlusIcon } from "./icons";

export interface ExpenseRow {
  id: string;
  description: string;
  category: Category;
  amountPaise: number;
  paidByName: string;
  splitCount: number;
  day: string | null;
}

export function ExpenseList({ slug, rows, memberCount }: { slug: string; rows: ExpenseRow[]; memberCount: number }) {
  const [filter, setFilter] = useState<Category | "all">("all");
  const visible = filter === "all" ? rows : rows.filter((r) => r.category === filter);
  const total = visible.reduce((sum, r) => sum + r.amountPaise, 0);

  // Rows arrive newest day first, undated last; keep that order while grouping.
  const groups: { day: string | null; rows: ExpenseRow[] }[] = [];
  for (const row of visible) {
    const last = groups[groups.length - 1];
    if (last && last.day === row.day) last.rows.push(row);
    else groups.push({ day: row.day, rows: [row] });
  }

  return (
    // pb-16 keeps the last row clear of the floating "Add expense" button (48px tall, 1rem above the tab bar).
    <div className="pb-16">
      <section className="card mb-4 bg-primary-soft/60 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          {filter === "all" ? "Total spent" : `${CATEGORY_META[filter].label} spend`}
        </p>
        <p className="font-display text-4xl font-semibold tabular-nums text-primary-deep">{formatINR(total)}</p>
        <p className="text-sm text-muted">
          {visible.length} {visible.length === 1 ? "expense" : "expenses"} · {memberCount} people
        </p>
      </section>

      <div className="chip-row -mx-4 mb-4 flex gap-2 px-4" role="group" aria-label="Filter by category">
        <button type="button" className="chip shrink-0" data-active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </button>
        {CATEGORIES.map((key) => (
          <button key={key} type="button" className="chip shrink-0" data-active={filter === key} onClick={() => setFilter(key)}>
            <span aria-hidden="true">{CATEGORY_META[key].emoji}</span>
            {CATEGORY_META[key].label}
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="card p-6 text-center text-muted">
          <p className="font-display text-lg font-semibold text-ink">Nothing here yet</p>
          <p className="text-sm">Add the first expense and the maths takes care of itself.</p>
        </div>
      )}

      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.day ?? "undated"}>
            <h2 className="mb-2 flex items-baseline justify-between text-sm font-bold text-muted">
              <span>{group.day ? formatDayShort(group.day) : "No specific day"}</span>
              <span className="tabular-nums">{formatINR(group.rows.reduce((sum, r) => sum + r.amountPaise, 0))}</span>
            </h2>
            <ul className="card divide-y divide-line overflow-hidden">
              {group.rows.map((row) => (
                <li key={row.id}>
                  <Link href={`/t/${slug}/expenses/${row.id}`} className="flex min-h-16 items-center gap-3 px-4 py-2.5 transition active:bg-card-soft">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl"
                      style={{ backgroundColor: `${CATEGORY_META[row.category].color}1f` }}
                      aria-label={CATEGORY_META[row.category].label}
                    >
                      {CATEGORY_META[row.category].emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold">{row.description}</span>
                      <span className="block truncate text-xs text-muted">
                        Paid by {row.paidByName} · split among {row.splitCount}
                      </span>
                    </span>
                    <span className="shrink-0 font-bold tabular-nums">{formatINR(row.amountPaise)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+1rem)] z-30">
        <div className="mx-auto flex max-w-[640px] justify-end px-4">
          <Link href={`/t/${slug}/expenses/new`} className="btn-accent pointer-events-auto !min-h-12 shadow-lg">
            <PlusIcon width={20} height={20} />
            Add expense
          </Link>
        </div>
      </div>
    </div>
  );
}
