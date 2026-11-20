import { DEMO_TRIP } from "../../db/demo-data";
import { formatINR } from "../../lib/money";
import { Avatar } from "../avatar";
import { CATEGORY_META } from "../categories";
import { formatDayShort, formatTime12 } from "../dates";
import { UpiIcon } from "../icons";
import { MONEY_TONE_CLASS, signedINR } from "../money-sign";
import {
  BALANCE_ROWS,
  BILL_ROWS,
  CATEGORY_ROWS,
  DAY_ONE_OPTIONS,
  DAY_ONE_PLANS,
  EXPENSE_COUNT,
  GROUP_MESSAGE_LINES,
  MAX_ABS_BALANCE_PAISE,
  PAYMENT_COUNT,
  PEOPLE_COUNT,
  TOTAL_PAISE,
  TRANSFERS,
  sharePercent,
} from "./demo";

// These are the product's own screens for the Kochi trip, built from the same pieces the app uses.
// They are static copies, so none has a working button: the real ones live in /t/kochi-2026.

export function PlanSheet() {
  const leadingYes = Math.max(...DAY_ONE_OPTIONS.map((o) => o.yes));
  return (
    <div data-ui className="card w-[560px] overflow-hidden">
      <h3 className="px-4 pb-2 pt-4 text-section">Day 1 · {formatDayShort(DEMO_TRIP.startDate)}</h3>
      <ul>
        {DAY_ONE_PLANS.map((plan) => (
          <li key={plan.title} className="flex items-start gap-3 px-4 py-3">
            <span className="num w-16 shrink-0 whitespace-nowrap pt-0.5 text-[15px] font-medium">{formatTime12(plan.time)}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold leading-snug">{plan.title}</span>
              {plan.notes && <span className="mt-0.5 block text-[15px] text-muted">{plan.notes}</span>}
            </span>
          </li>
        ))}
      </ul>
      <div className="px-4 pb-4 pt-3">
        <p className="label !mb-2">Dinner at 8:00 pm, the group votes</p>
        <ul className="panel p-4">
          {DAY_ONE_OPTIONS.map((option) => (
            <li key={option.title} className="py-3 first:pt-0 last:pb-0">
              <p className="text-base font-semibold leading-snug">{option.title}</p>
              {option.notes && <p className="mt-0.5 text-[15px] text-muted">{option.notes}</p>}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-active">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(option.yes / PEOPLE_COUNT) * 100}%` }} />
              </div>
              <p className="num mt-1.5 text-[15px] text-muted">
                <span className={option.yes === leadingYes ? "font-semibold text-text" : undefined}>{option.yes} in</span>
                {` · ${option.no} out of ${PEOPLE_COUNT}`}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function BillsSheet() {
  const lastDayTotal = BILL_ROWS.reduce((sum, row) => sum + row.amountPaise, 0);
  return (
    <div data-ui className="w-[560px] space-y-4">
      <div className="card p-4">
        <p className="text-[15px] text-muted">Total spent</p>
        <p className="text-lead num">{formatINR(TOTAL_PAISE)}</p>
        <p className="mt-1 text-[15px] text-muted">
          <span className="num">{EXPENSE_COUNT}</span> expenses · <span className="num">{formatINR(Math.round(TOTAL_PAISE / PEOPLE_COUNT))}</span> a head
        </p>
        <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-active">
          {CATEGORY_ROWS.map((row) => (
            <span key={row.key} className="min-w-1" style={{ flex: `${row.amountPaise} 1 0%`, backgroundColor: CATEGORY_META[row.key].chart }} />
          ))}
        </div>
        <ul className="mt-3 space-y-1">
          {CATEGORY_ROWS.map((row) => (
            <li key={row.key} className="flex min-h-8 items-center gap-2 text-[15px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_META[row.key].chart }} />
              <span className="min-w-0 flex-1">{CATEGORY_META[row.key].label}</span>
              <span className="num font-medium">{formatINR(row.amountPaise)}</span>
              <span className="num w-10 shrink-0 text-right text-muted">{sharePercent(row.amountPaise)}%</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 flex items-baseline justify-between gap-3 text-[15px] font-semibold">
          <span>{formatDayShort(DEMO_TRIP.endDate)}</span>
          <span className="num font-medium text-muted">{formatINR(lastDayTotal)}</span>
        </h3>
        <ul className="card overflow-hidden">
          {BILL_ROWS.map((row) => {
            const { Icon, label, tint, ink } = CATEGORY_META[row.category];
            return (
              <li key={row.description} className="flex min-h-16 items-center gap-3 px-4 py-3">
                <Avatar name={row.paidBy.name} color={row.paidBy.color} className="!text-[14px]" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-base font-medium">{row.description}</span>
                    <span className="num shrink-0 text-right text-base font-semibold">{formatINR(row.amountPaise)}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-[15px] text-muted">
                    <span className="pill shrink-0 !text-[14px]" style={{ backgroundColor: tint, color: ink }}>
                      <Icon width={12} height={12} />
                      {label}
                    </span>
                    <span className="min-w-0 truncate">Paid by {row.paidBy.name}</span>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function PaymentRows({ count }: { count: number }) {
  return (
    <ul className="mt-4">
      {TRANSFERS.slice(0, count).map((t) => (
        <li key={`${t.from.name}-${t.to.name}`} className="flex items-center gap-3 py-3">
          <span className="flex shrink-0">
            <Avatar name={t.from.name} color={t.from.color} size="sm" className="!text-[14px] ring-2 ring-surface" />
            <Avatar name={t.to.name} color={t.to.color} size="sm" className="-ml-1 !text-[14px] ring-2 ring-surface" />
          </span>
          <span className="min-w-0 flex-1 truncate text-base">
            <span className="font-semibold">{t.from.name}</span> pays <span className="font-semibold">{t.to.name}</span>
          </span>
          <span className="num text-base font-semibold">{formatINR(t.amountPaise)}</span>
        </li>
      ))}
    </ul>
  );
}

/** One compact row per person: a bar to the right for what they get back, to the left for what they owe. */
export function BalanceRiver({ limit }: { limit?: number }) {
  return (
    <ul className="mt-4 space-y-2">
      {BALANCE_ROWS.slice(0, limit).map((row) => {
        const { text, tone } = signedINR(row.netPaise);
        const halfWidth = (Math.abs(row.netPaise) / MAX_ABS_BALANCE_PAISE) * 50;
        return (
          <li key={row.name} className="grid grid-cols-[6.5rem_minmax(0,1fr)_5.5rem] items-center gap-2">
            <span className="flex min-w-0 items-center gap-2 text-[15px]">
              <Avatar name={row.name} color={row.color} size="sm" className="!text-[14px]" />
              <span className="truncate">{row.name}</span>
            </span>
            <span className="relative h-3">
              <span className="absolute inset-y-[-4px] left-1/2 w-0.5 bg-control" />
              {row.netPaise > 0 && <span className="absolute inset-y-0 left-1/2 rounded-full bg-accent" style={{ width: `${halfWidth}%` }} />}
              {row.netPaise < 0 && <span className="absolute inset-y-0 right-1/2 rounded-full bg-text/70" style={{ width: `${halfWidth}%` }} />}
            </span>
            <span className={`num text-right text-[15px] font-semibold ${MONEY_TONE_CLASS[tone]}`}>{text}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function SettleSheet() {
  return (
    <div data-ui className="card w-[560px] p-5">
      <h3 className="text-section">{PAYMENT_COUNT} payments settle everyone</h3>
      <p className="mt-1 text-[15px] text-muted">
        {DEMO_TRIP.name} · {PEOPLE_COUNT} people
      </p>
      <BalanceRiver />
      <PaymentRows count={3} />
    </div>
  );
}

export function MessageSheet() {
  const first = TRANSFERS[0];
  return (
    <div data-ui className="card w-[440px] p-4">
      <p className="mb-3 text-[15px] text-muted">One tap on Copy all, then paste into the group</p>
      {/* The text is exactly what the Settle screen's "Copy all" puts on the clipboard. */}
      <div className="rounded-panel rounded-tl-sm bg-accent-soft p-4 text-base leading-relaxed text-accent-ink">
        {GROUP_MESSAGE_LINES.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
      <p className="mt-3 inline-flex items-center gap-1.5 text-[15px] font-medium text-accent-ink">
        <UpiIcon width={14} height={14} />
        Pay {formatINR(first.amountPaise)} via UPI
      </p>
    </div>
  );
}
