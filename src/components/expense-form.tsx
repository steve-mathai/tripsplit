"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { deleteExpenseAction, saveExpenseAction } from "@/app/t/[slug]/actions";
import { computeShares, validateSplit } from "@/lib/split";
import { formatINR, parseINR } from "@/lib/money";
import { CATEGORIES, SPLIT_MODES, type Category, type SplitMode } from "@/lib/types";
import { Avatar } from "./avatar";
import { CATEGORY_META } from "./categories";
import { formatDayShort } from "./dates";
import { ChevronLeftIcon, MinusIcon, PlusIcon, TrashIcon } from "./icons";

export interface FormMember {
  id: string;
  name: string;
  color: string;
}

export interface ExpenseFormInitial {
  id: string;
  description: string;
  amountPaise: number;
  category: Category;
  paidBy: string;
  day: string | null;
  mode: SplitMode;
  splits: { memberId: string; weight: number }[];
}

const MODE_LABEL: Record<SplitMode, string> = { equal: "Equally", exact: "Exact", shares: "Shares" };
const NO_DAY = "";

/** Plain rupee text for an input box (no symbol or grouping, so parseINR round-trips it). */
function toInputRupees(paise: number): string {
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

export function ExpenseForm({
  slug,
  members,
  days,
  defaultPaidBy,
  defaultDay,
  initial,
}: {
  slug: string;
  members: FormMember[];
  days: string[];
  defaultPaidBy: string;
  defaultDay: string;
  initial?: ExpenseFormInitial;
}) {
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amountText, setAmountText] = useState(initial ? toInputRupees(initial.amountPaise) : "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "food");
  const [paidBy, setPaidBy] = useState(initial?.paidBy ?? defaultPaidBy);
  const [day, setDay] = useState(initial ? (initial.day ?? NO_DAY) : defaultDay);
  const [mode, setMode] = useState<SplitMode>(initial?.mode ?? "equal");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial ? initial.splits.map((s) => s.memberId) : members.map((m) => m.id)),
  );
  const [exactText, setExactText] = useState<Record<string, string>>(() =>
    initial?.mode === "exact"
      ? Object.fromEntries(initial.splits.map((s) => [s.memberId, toInputRupees(s.weight)]))
      : {},
  );
  const [sharesCount, setSharesCount] = useState<Record<string, number>>(() =>
    initial?.mode === "shares" ? Object.fromEntries(initial.splits.map((s) => [s.memberId, s.weight])) : {},
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [pending, startTransition] = useTransition();

  const amountPaise = parseINR(amountText);

  const splits = useMemo(
    () =>
      members
        .filter((m) => selected.has(m.id))
        .map((m) => ({
          memberId: m.id,
          weight:
            mode === "equal" ? 1 : mode === "shares" ? (sharesCount[m.id] ?? 1) : (parseINR(exactText[m.id] ?? "") ?? 0),
        })),
    [members, selected, mode, sharesCount, exactText],
  );

  const splitProblem = validateSplit({ amountPaise: amountPaise ?? 0, mode, splits });

  // A blank box counts as 0, but text that is not an amount must not silently become 0.
  const unreadableExactIds = useMemo(() => {
    if (mode !== "exact") return [];
    const unreadable = (text: string) => text.trim() !== "" && parseINR(text) === null;
    return splits.filter((s) => unreadable(exactText[s.memberId] ?? "")).map((s) => s.memberId);
  }, [mode, splits, exactText]);

  // Per-person preview only exists once the split is valid.
  const preview = useMemo(() => {
    if (splitProblem) return null;
    return computeShares({ amountPaise: amountPaise ?? 0, mode, splits });
  }, [splitProblem, amountPaise, mode, splits]);

  const exactAssigned = splits.reduce((sum, s) => sum + s.weight, 0);
  const exactLeft = (amountPaise ?? 0) - exactAssigned;

  const descriptionProblem = description.trim() ? null : "Add a short description";
  const exactProblem = unreadableExactIds.length > 0 ? "Fix the amounts marked in red" : null;
  const blocking = descriptionProblem ?? exactProblem ?? splitProblem;
  const shownProblem = attempted || amountPaise !== null ? blocking : null;

  function toggleMember(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function fillExactEvenly() {
    if (!amountPaise || selected.size === 0) return;
    const even = computeShares({
      amountPaise,
      mode: "equal",
      splits: members.filter((m) => selected.has(m.id)).map((m) => ({ memberId: m.id, weight: 1 })),
    });
    setExactText(Object.fromEntries([...even].map(([id, paise]) => [id, toInputRupees(paise)])));
  }

  function bumpShares(id: string, delta: number) {
    setSharesCount((current) => ({ ...current, [id]: Math.min(20, Math.max(1, (current[id] ?? 1) + delta)) }));
  }

  function submit() {
    setAttempted(true);
    if (blocking || amountPaise === null) return;
    setServerError(null);
    startTransition(async () => {
      const result = await saveExpenseAction(slug, initial?.id ?? null, {
        description: description.trim(),
        amountPaise,
        category,
        paidBy,
        day: day === NO_DAY ? null : day,
        mode,
        splits,
      });
      if (result?.error) setServerError(result.error);
    });
  }

  function remove() {
    if (!initial || !window.confirm("Delete this expense? This cannot be undone.")) return;
    setServerError(null);
    startTransition(async () => {
      const result = await deleteExpenseAction(slug, initial.id);
      if (result?.error) setServerError(result.error);
    });
  }

  const backHref = `/t/${slug}/expenses`;
  const everyone = selected.size === members.length;

  return (
    <div className="pb-40">
      <div className="mb-4 flex items-center gap-2">
        <Link href={backHref} aria-label="Back to expenses" className="btn-ghost !h-11 !w-11 !px-0">
          <ChevronLeftIcon width={20} height={20} />
        </Link>
        <h1 className="font-display text-2xl font-semibold">{initial ? "Edit expense" : "Add expense"}</h1>
        {initial && (
          <button type="button" onClick={remove} disabled={pending} aria-label="Delete expense" className="btn-danger ml-auto !h-11 !w-11 !px-0">
            <TrashIcon width={20} height={20} />
          </button>
        )}
      </div>

      <div className="card mb-4 p-4">
        <label className="label" htmlFor="amount">
          Amount
        </label>
        <div className="flex items-center gap-2">
          <span className="font-display text-3xl font-semibold text-accent-deep" aria-hidden="true">
            ₹
          </span>
          <input
            id="amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            className="field !border-0 !bg-transparent !px-1 font-display !text-4xl font-semibold !ring-0"
          />
        </div>
        {amountText && amountPaise !== null && (
          <p className="mt-1 text-sm text-muted">{formatINR(amountPaise)}</p>
        )}
        {amountText && amountPaise === null && <p className="mt-1 text-sm text-bad">That does not look like an amount.</p>}

        <label className="label mt-4" htmlFor="description">
          What was it for?
        </label>
        <input
          id="description"
          className="field"
          placeholder="Kerala meals, auto to fort, tea..."
          value={description}
          maxLength={80}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="card mb-4 p-4">
        <span className="label">Category</span>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Category">
          {CATEGORIES.map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={category === key}
              data-active={category === key}
              onClick={() => setCategory(key)}
              className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-card text-xs font-semibold transition active:scale-95 data-[active=true]:border-primary data-[active=true]:bg-primary-soft data-[active=true]:text-primary-deep"
            >
              <span className="text-2xl" aria-hidden="true">
                {CATEGORY_META[key].emoji}
              </span>
              {CATEGORY_META[key].label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="paid-by">
              Paid by
            </label>
            <select id="paid-by" className="field" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="day">
              Date
            </label>
            <select id="day" className="field" value={day} onChange={(e) => setDay(e.target.value)}>
              {days.map((d) => (
                <option key={d} value={d}>
                  {formatDayShort(d)}
                </option>
              ))}
              <option value={NO_DAY}>No specific day</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <span className="label">Split</span>
        <div className="mb-4 grid grid-cols-3 rounded-full bg-card-soft p-1" role="tablist" aria-label="Split mode">
          {SPLIT_MODES.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              onClick={() => setMode(key)}
              className="min-h-11 rounded-full text-sm font-semibold text-muted transition aria-selected:bg-card aria-selected:text-primary-deep aria-selected:shadow-sm"
            >
              {MODE_LABEL[key]}
            </button>
          ))}
        </div>

        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm text-muted">
            {mode === "equal" && "Everyone ticked pays the same."}
            {mode === "exact" && "Type what each person owes."}
            {mode === "shares" && "Double share = double the bill."}
          </p>
          <div className="flex gap-1.5">
            <button type="button" className="chip !min-h-9 !px-3 text-xs" data-active={everyone} onClick={() => setSelected(new Set(members.map((m) => m.id)))}>
              All
            </button>
            <button type="button" className="chip !min-h-9 !px-3 text-xs" data-active={selected.size === 0} onClick={() => setSelected(new Set())}>
              None
            </button>
          </div>
        </div>

        <ul className="divide-y divide-line">
          {members.map((m) => {
            const checked = selected.has(m.id);
            const share = preview?.get(m.id);
            return (
              <li key={m.id} className="flex min-h-14 items-center gap-3 py-1.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleMember(m.id)}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
                      checked ? "border-primary bg-primary text-white" : "border-line"
                    }`}
                    aria-hidden="true"
                  >
                    {checked && (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                    )}
                  </span>
                  <Avatar name={m.name} color={m.color} size="sm" />
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-semibold ${checked ? "" : "text-muted"}`}>{m.name}</span>
                    {/* Shares rows are full with the steppers, so the per-head amount sits under the name instead of at the right edge. */}
                    {checked && mode === "shares" && share !== undefined && (
                      <span className="block text-xs font-semibold tabular-nums text-primary-deep">{formatINR(share)}</span>
                    )}
                  </span>
                </button>

                {checked && mode === "exact" && (
                  <div className="flex w-28 shrink-0 items-center gap-1">
                    <span className="text-muted" aria-hidden="true">
                      ₹
                    </span>
                    <input
                      inputMode="decimal"
                      aria-label={`Amount for ${m.name}`}
                      aria-invalid={unreadableExactIds.includes(m.id)}
                      placeholder="0"
                      className="field !min-h-11 text-right aria-invalid:!border-bad aria-invalid:!ring-2 aria-invalid:!ring-bad/25"
                      value={exactText[m.id] ?? ""}
                      onChange={(e) => setExactText((current) => ({ ...current, [m.id]: e.target.value }))}
                    />
                  </div>
                )}

                {checked && mode === "shares" && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button type="button" aria-label={`Fewer shares for ${m.name}`} onClick={() => bumpShares(m.id, -1)} className="btn-ghost !h-11 !w-11 !px-0">
                      <MinusIcon width={18} height={18} />
                    </button>
                    <span className="w-6 text-center text-sm font-bold tabular-nums">{sharesCount[m.id] ?? 1}</span>
                    <button type="button" aria-label={`More shares for ${m.name}`} onClick={() => bumpShares(m.id, 1)} className="btn-ghost !h-11 !w-11 !px-0">
                      <PlusIcon width={18} height={18} />
                    </button>
                  </div>
                )}

                {checked && mode === "equal" && (
                  <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums text-primary-deep">
                    {share === undefined ? "" : formatINR(share)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {mode === "exact" && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p
              aria-live="polite"
              className={`text-sm font-bold ${exactProblem || exactLeft < 0 ? "text-bad" : exactLeft === 0 && amountPaise ? "text-good" : "text-accent-deep"}`}
            >
              {exactProblem ??
                (!amountPaise
                  ? "Enter the amount first"
                  : exactLeft === 0
                    ? "All assigned"
                    : exactLeft > 0
                      ? `${formatINR(exactLeft)} left to assign`
                      : `${formatINR(-exactLeft)} over the total`)}
            </p>
            <button type="button" className="chip !min-h-9 text-xs" onClick={fillExactEvenly} disabled={!amountPaise || selected.size === 0}>
              Fill evenly
            </button>
          </div>
        )}

        {mode === "shares" && preview && (
          <p className="mt-3 text-sm text-muted">
            {splits.reduce((sum, s) => sum + s.weight, 0)} shares in total, previewed per person above.
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto max-w-[640px]">
          {(shownProblem || serverError) && (
            <p role="alert" className="mb-2 text-sm font-semibold text-bad">
              {serverError ?? shownProblem}
            </p>
          )}
          <button type="button" onClick={submit} disabled={pending} className="btn-accent w-full !min-h-12 text-base">
            {pending ? "Saving..." : initial ? "Save changes" : "Add expense"}
            {!pending && amountPaise ? ` · ${formatINR(amountPaise)}` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
