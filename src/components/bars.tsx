import type { ReactNode } from "react";
import { formatINR } from "@/lib/money";

/** Thin ring for the share of a whole. Segments start at 12 o'clock with a 2px gap; the hole holds `centre`. */
export function RingChart({
  segments,
  description,
  centre,
}: {
  segments: { key: string; value: number; color: string }[];
  /** Spoken equivalent of the chart, since slices carry no labels. */
  description: string;
  centre?: ReactNode;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  // Viewbox units: the ring renders at 150px for a 120 unit box, so 1.6 units is 2px and 9 units is ~11px.
  const gap = visible.length > 1 ? 1.6 : 0;
  let offset = 0;
  return (
    <div className="relative h-[150px] w-[150px] shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={description}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--active)" strokeWidth="9" />
        {total > 0 &&
          visible.map((s) => {
            const length = (s.value / total) * circumference;
            const arc = (
              <circle
                key={s.key}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth="9"
                strokeDasharray={`${Math.max(0, length - gap)} ${circumference}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return arc;
          })}
      </svg>
      {centre && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{centre}</div>}
    </div>
  );
}

/**
 * One row per item: the accent bar is the share consumed, a 2px ink tick on the same track is what the
 * person paid. Both use one scale (the largest value of either) so bar and tick are comparable.
 */
export function BulletRows({
  rows,
}: {
  rows: { key: string; name: string; label: ReactNode; sharePaise: number; paidPaise: number }[];
}) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.sharePaise, r.paidPaise]));
  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-base">{row.label}</span>
            <span className="num shrink-0 whitespace-nowrap text-base font-semibold">{formatINR(row.sharePaise)}</span>
          </div>
          <div
            className="relative mt-2 h-3 rounded-full bg-active"
            role="img"
            aria-label={`${row.name}: share ${formatINR(row.sharePaise)}, paid ${formatINR(row.paidPaise)}`}
          >
            {row.sharePaise > 0 && (
              <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${(row.sharePaise / max) * 100}%` }} />
            )}
            {row.paidPaise > 0 && (
              <div
                className="absolute -top-1 h-5 w-0.5 bg-text"
                style={{ left: `min(calc(100% - 2px), calc(${(row.paidPaise / max) * 100}% - 1px))` }}
              />
            )}
          </div>
          <p className="num mt-1.5 text-sm text-muted">{row.paidPaise > 0 ? `Paid ${formatINR(row.paidPaise)}` : "Paid nothing"}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * Square-topped columns, one hue, value printed on top and the label below, so no axis or gridlines are
 * needed. Scrolls sideways when a long trip has more days than fit.
 */
export function DayColumns({ days }: { days: { key: string; label: string; valuePaise: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.valuePaise));
  return (
    <div className="overflow-x-auto">
      <ul className="flex min-w-full gap-2">
        {days.map((day) => (
          <li key={day.key} className="min-w-fit flex-1">
            <span className="sr-only">
              {day.label}: {formatINR(day.valuePaise)}
            </span>
            <div aria-hidden="true" className="min-w-16">
              <div className="flex h-40 flex-col justify-end border-b border-control">
                <p className="num mb-1 whitespace-nowrap text-center text-meta text-muted">{formatINR(day.valuePaise)}</p>
                <div
                  className="mx-auto w-full max-w-9 bg-accent"
                  style={{ height: `max(2px, calc((100% - 1.5rem) * ${day.valuePaise / max}))` }}
                />
              </div>
              <p className="num mt-1.5 whitespace-nowrap text-center text-sm text-muted">{day.label}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
