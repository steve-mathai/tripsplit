import { DEMO_TRIP } from "../../db/demo-data";
import { formatINR } from "../../lib/money";
import { CATEGORIES } from "../../lib/types";
import { Avatar } from "../avatar";
import { CATEGORY_META } from "../categories";
import { PAYMENT_COUNT, PEOPLE, PEOPLE_COUNT, TODDY } from "./demo";
import { PaymentRows } from "./sheets";

// The three states of the pinned stage: the same screens as the app, shown without working controls.

const PICKED = "Meera";

/** State 1: the "Who are you?" picker, one name selected. */
export function PickerFragment() {
  return (
    <div data-ui className="card w-[440px] p-5">
      <h3 className="text-base font-semibold">Who are you?</h3>
      <p className="mb-4 mt-0.5 text-[15px] text-muted">Pick your name to vote and react. This is remembered on this phone only.</p>
      <div className="grid grid-cols-3 gap-2">
        {PEOPLE.map((person) => (
          <div key={person.name} data-active={person.name === PICKED} className="chip min-w-0 !justify-start !pl-1.5">
            <Avatar name={person.name} color={person.color} size="sm" className="!text-[14px]" />
            <span className="min-w-0 truncate">{person.name}</span>
          </div>
        ))}
        <div className="chip min-w-0 text-muted">Not on the list</div>
      </div>
    </div>
  );
}

/** State 2: the add-expense form filled in for the toddy shop dinner, split by shares. */
export function ExpenseFragment() {
  const shown = TODDY.rows.slice(0, 3);
  return (
    <div data-ui className="card w-[440px] space-y-4 p-5">
      <div>
        <p className="label">Amount</p>
        <p className="text-lead num">{formatINR(TODDY.amountPaise)}</p>
        <p className="label mt-3">What was it for</p>
        <div className="field flex items-center">{TODDY.description}</div>
      </div>
      <div>
        <p className="label">Category</p>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((key) => {
            const { Icon, label, tint, ink } = CATEGORY_META[key];
            const selected = key === TODDY.category;
            return (
              <div
                key={key}
                className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-panel border-2 px-1 text-[15px] font-medium"
                style={selected ? { backgroundColor: tint, color: ink, borderColor: ink } : { borderColor: "var(--border)" }}
              >
                <Icon width={20} height={20} />
                {label}
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <p className="label">Split</p>
        <div className="grid grid-cols-3 gap-1 rounded-full bg-neutral-bg p-1 text-[15px] font-semibold">
          {["Equally", "Exact", "Shares"].map((mode) => (
            <div
              key={mode}
              className={`flex min-h-10 items-center justify-center rounded-full border ${
                mode === "Shares" ? "border-border bg-surface text-text" : "border-transparent text-muted"
              }`}
            >
              {mode}
            </div>
          ))}
        </div>
        <ul className="mt-2">
          {shown.map((row) => (
            <li key={row.person.name} className="flex min-h-12 items-center gap-3 py-1.5">
              <Avatar name={row.person.name} color={row.person.color} size="sm" className="!text-[14px]" />
              <span className="min-w-0 flex-1 text-base font-medium">
                {row.person.name}
                <span className="num ml-2 text-[15px] font-normal text-muted">
                  {row.shares} {row.shares === 1 ? "share" : "shares"}
                </span>
              </span>
              <span className="num text-base font-semibold">{formatINR(row.sharePaise)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-[15px] text-muted">
          and {TODDY.rows.length - shown.length} more, {TODDY.totalShares} shares in all, paid by {TODDY.paidBy.name}
        </p>
      </div>
    </div>
  );
}

/** State 3: the settle result. */
export function SettleFragment() {
  return (
    <div data-ui className="card w-[440px] p-5">
      <h3 className="text-section">{PAYMENT_COUNT} payments settle everyone</h3>
      <p className="mt-1 text-[15px] text-muted">
        {DEMO_TRIP.name} · {PEOPLE_COUNT} people
      </p>
      <PaymentRows count={5} />
    </div>
  );
}
