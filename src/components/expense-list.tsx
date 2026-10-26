"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

  const inlineAddRef = useRef<HTMLAnchorElement>(null);
  // Starts true so the floating button is hidden until the observer reports the inline one is gone.
  const [inlineAddVisible, setInlineAddVisible] = useState(true);
  const [scrollingDown, setScrollingDown] = useState(false);
  const showFab = !inlineAddVisible && !scrollingDown;

  useEffect(() => {
    const target = inlineAddRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setInlineAddVisible(entry.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let lastY = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      const atBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 8;
      // A few pixels of slack so touch jitter does not flicker the button.
      if (atBottom || y < lastY - 4) setScrollingDown(false);
      else if (y > lastY + 4) setScrollingDown(true);
      lastY = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Rows arrive newest day first, undated last; keep that order while grouping.
  const groups: { day: string | null; rows: ExpenseRow[] }[] = [];
  for (const row of visible) {
    const last = groups[groups.length - 1];
    if (last && last.day === row.day) last.rows.push(row);
    else groups.push({ day: row.day, rows: [row] });
  }

  return (
    // pb-16 keeps the last row clear of the floating "Add expense" button (48px tall, 1rem above the tab bar),
    // which only shows once the inline button has scrolled away and the user is not scrolling down.
    <div className="pb-16">
      <section className="card mb-4 bg-primary-soft/60 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          {filter === "all" ? "Total spent" : `${CATEGORY_META[filter].label} spend`}
        </p>
        <p className="font-display text-4xl font-semibold tabular-nums text-primary-deep">{formatINR(total)}</p>
        <p className="text-sm text-muted">
          {visible.length} {visible.length === 1 ? "expense" : "expenses"} · {memberCount} people
        </p>
        <Link ref={inlineAddRef} href={`/t/${slug}/expenses/new`} className="btn-accent mt-3 w-full">
          <PlusIcon width={20} height={20} />
          Add expense
        </Link>
      </section>

      <div className="chip-row -mx-4 mb-4 flex gap-2 px-4" role="group" aria-label="Filter by category">
        <button type="button" className="chip shrink-0" data-active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </button>
        {CATEGORIES.map((key) => {
          const { Icon, label } = CATEGORY_META[key];
          return (
            <button key={key} type="button" className="chip shrink-0" data-active={filter === key} onClick={() => setFilter(key)}>
              <Icon width={18} height={18} />
              {label}
            </button>
          );
        })}
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
              {group.rows.map((row) => {
                const { Icon, label, color } = CATEGORY_META[row.category];
                return (
                  <li key={row.id}>
                    <Link href={`/t/${slug}/expenses/${row.id}`} className="flex min-h-16 items-center gap-3 px-4 py-2.5 transition active:bg-card-soft">
                      {/* Mixing the category colour with --ink darkens it in light mode and lightens it in dark, so the icon stays readable on the tint. */}
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: `${color}1f`, color: `color-mix(in oklab, ${color} 70%, var(--ink))` }}
                        aria-label={label}
                      >
                        <Icon width={22} height={22} />
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
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+1rem)] z-30">
        <div className="mx-auto flex max-w-[640px] justify-end px-4">
          {/* inert keeps the hidden button out of the tab order and away from taps and screen readers. */}
          <Link
            href={`/t/${slug}/expenses/new`}
            inert={!showFab}
            className={`btn-accent !min-h-12 shadow-lg duration-200 motion-reduce:transition-none ${
              showFab ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
            }`}
          >
            <PlusIcon width={20} height={20} />
            Add expense
          </Link>
        </div>
      </div>
    </div>
  );
}
