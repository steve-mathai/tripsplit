import type { ReactNode } from "react";
import { formatINR } from "@/lib/money";

/** Server-renderable horizontal bar chart: label, bar, value. Pure CSS, no chart library. */
export function BarRows({
  rows,
}: {
  rows: {
    key: string;
    label: ReactNode;
    value: number;
    /** Optional second measure drawn as a tick on the same track (e.g. what they paid). */
    marker?: number;
    color: string;
    valueLabel?: string;
    note?: string;
  }[];
}) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.value, r.marker ?? 0]));
  return (
    <ul className="space-y-3.5">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-semibold">{row.label}</span>
            <span className="shrink-0 font-bold tabular-nums">{row.valueLabel ?? formatINR(row.value)}</span>
          </div>
          <div
            className="relative h-3 rounded-full bg-card-soft"
            role="img"
            aria-label={`${typeof row.label === "string" ? row.label : row.key}: ${formatINR(row.value)}`}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${Math.max(2, (row.value / max) * 100)}%`, backgroundColor: row.color }}
            />
            {row.marker !== undefined && row.marker > 0 && (
              <div
                className="absolute -top-1 h-5 w-1 rounded-full bg-accent ring-2 ring-card"
                style={{ left: `calc(${Math.min(100, (row.marker / max) * 100)}% - 2px)` }}
                title={`Paid ${formatINR(row.marker)}`}
              />
            )}
          </div>
          {row.note && <p className="mt-1 text-xs text-muted">{row.note}</p>}
        </li>
      ))}
    </ul>
  );
}

/** Donut drawn with stroke-dasharray arcs; segments start at 12 o'clock. */
export function Donut({
  segments,
  centre,
}: {
  segments: { key: string; value: number; color: string }[];
  centre: ReactNode;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="relative mx-auto h-44 w-44 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label="Spend by category">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--card-soft)" strokeWidth="13" />
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const length = (s.value / total) * circumference;
              const circle = (
                <circle
                  key={s.key}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="13"
                  strokeDasharray={`${Math.max(0, length - 1.2)} ${circumference}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return circle;
            })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{centre}</div>
    </div>
  );
}
