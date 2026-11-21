"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteExpenseAction, saveExpenseAction } from "@/app/t/[slug]/actions";
import { computeShares, validateSplit } from "@/lib/split";
import { formatINR, parseINR } from "@/lib/money";
import { CATEGORIES, SPLIT_MODES, type Category, type SplitMode } from "@/lib/types";
import { Avatar } from "./avatar";
import { CATEGORY_META } from "./categories";
import type { ExpensePrefill } from "@/lib/quick-add";
import { formatDayShort } from "./dates";
import { MinusIcon, PlusIcon, TrashIcon } from "./icons";

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
  prefill,
}: {
  slug: string;
  members: FormMember[];
  days: string[];
  defaultPaidBy: string;
  defaultDay: string;
  initial?: ExpenseFormInitial;
  /** Values understood by Quick add; only used on a new expense. */
  prefill?: ExpensePrefill;
}) {
  const [description, setDescription] = useState(initial?.description ?? prefill?.description ?? "");
  const [amountText, setAmountText] = useState(() => {
    const paise = initial?.amountPaise ?? prefill?.amountPaise;
    return paise === undefined ? "" : toInputRupees(paise);
  });
  const [category, setCategory] = useState<Category>(initial?.category ?? "food");
  const [paidBy, setPaidBy] = useState(initial?.paidBy ?? prefill?.paidBy ?? defaultPaidBy);
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
  // Live refresh waits while a save is running or the typed text differs from what the page loaded with.
  // Prefilled text counts as unsaved: the baseline is the saved expense, or empty for a new one.
  const holdRefresh =
    pending ||
    description !== (initial?.description ?? "") ||
    amountText !== (initial ? toInputRupees(initial.amountPaise) : "");

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

  const everyone = selected.size === members.length;
  const amountUnreadable = Boolean(amountText) && amountPaise === null;

  return (
    // pb-24 keeps the last field clear of the fixed save bar.
    <div className="pb-24" data-refresh-hold={holdRefresh ? "" : undefined}>
      {/* The slim bar above (trip header) already carries the back link for this route. */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="min-w-0 truncate text-title">{initial ? "Edit expense" : "Add expense"}</h1>
        {initial && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label="Delete expense"
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-negative transition-colors hover:bg-negative-bg disabled:opacity-50"
          >
            <TrashIcon width={18} height={18} aria-hidden="true" />
            Delete
          </button>
        )}
      </div>

      <div className="wide-2col items-start">
        <div className="space-y-4">
          <div className="card p-4">
            <label className="label" htmlFor="amount">
              Amount
            </label>
            <div className="flex items-center gap-1">
              <span className="text-lead text-muted" aria-hidden="true">
                ₹
              </span>
              <input
                id="amount"
                name="amount"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="next"
                placeholder="0"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                aria-invalid={amountUnreadable}
                aria-describedby={amountUnreadable ? "amount-error" : undefined}
                className="num min-w-0 flex-1 rounded-panel bg-transparent py-1 text-lead text-text placeholder:text-muted"
              />
            </div>
            {amountUnreadable && (
              <p id="amount-error" className="mt-1 text-sm text-negative">
                That does not look like an amount.
              </p>
            )}

            <label className="label mt-4" htmlFor="description">
              What was it for?
            </label>
            <input
              id="description"
              name="description"
              autoComplete="off"
              className="field"
              placeholder="Kerala meals, auto to fort, tea…"
              value={description}
              maxLength={80}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="card p-4">
            <span className="label" id="category-label">
              Category
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-labelledby="category-label">
              {CATEGORIES.map((key) => {
                const { Icon, label, tint, ink } = CATEGORY_META[key];
                const isSelected = category === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setCategory(key)}
                    // The 2px border is always present (transparent when unselected) so selecting never shifts the layout.
                    style={{ backgroundColor: tint, color: ink, borderColor: isSelected ? ink : "transparent" }}
                    className="flex min-h-14 min-w-0 flex-row items-center justify-start gap-2 rounded-panel border-2 px-3 text-sm font-medium transition-colors active:scale-[0.98] motion-reduce:active:scale-100 sm:min-h-[4.5rem] sm:flex-col sm:justify-center sm:gap-1.5 sm:px-1"
                  >
                    <Icon width={22} height={22} aria-hidden="true" className="shrink-0" />
                    <span className="min-w-0 max-w-full truncate">{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="min-w-0">
                <label className="label" htmlFor="paid-by">
                  Paid by
                </label>
                <select id="paid-by" name="paid-by" className="select" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label className="label" htmlFor="day">
                  Date
                </label>
                <select id="day" name="day" className="select" value={day} onChange={(e) => setDay(e.target.value)}>
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
        </div>

        <div className="card p-4">
          <span className="label" id="split-label">
            Split
          </span>
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-full bg-neutral-bg p-1" role="radiogroup" aria-labelledby="split-label">
            {SPLIT_MODES.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={mode === key}
                onClick={() => setMode(key)}
                className="min-h-11 rounded-full border border-transparent text-sm font-semibold text-muted transition-colors aria-checked:border-border aria-checked:bg-surface aria-checked:text-text"
              >
                {MODE_LABEL[key]}
              </button>
            ))}
          </div>

          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="min-w-0 text-sm text-muted">
              {mode === "equal" && "Everyone ticked pays the same."}
              {mode === "exact" && "Type what each person owes."}
              {mode === "shares" && "Double share = double the bill."}
            </p>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                className="btn-ghost !px-3 aria-pressed:bg-active"
                aria-pressed={everyone}
                onClick={() => setSelected(new Set(members.map((m) => m.id)))}
              >
                All
              </button>
              <button
                type="button"
                className="btn-ghost !px-3 aria-pressed:bg-active"
                aria-pressed={selected.size === 0}
                onClick={() => setSelected(new Set())}
              >
                None
              </button>
            </div>
          </div>

          <ul className="divide-y divide-rule">
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
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-mark border-2 transition-colors ${
                        checked ? "border-accent bg-accent text-surface" : "border-control"
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
                      <span className={`line-clamp-2 block text-base font-medium [overflow-wrap:anywhere] ${checked ? "" : "text-muted"}`}>{m.name}</span>
                      {/* Shares rows are full with the steppers, so the per-head amount sits under the name instead of at the right edge. */}
                      {checked && mode === "shares" && share !== undefined && (
                        <span className="num block text-sm text-muted">{formatINR(share)}</span>
                      )}
                    </span>
                  </button>

                  {checked && mode === "exact" && (
                    <div className="flex w-32 shrink-0 items-center gap-1">
                      <span className="text-muted" aria-hidden="true">
                        ₹
                      </span>
                      <input
                        inputMode="decimal"
                        autoComplete="off"
                        spellCheck={false}
                        aria-label={`Amount for ${m.name}`}
                        aria-invalid={unreadableExactIds.includes(m.id)}
                        placeholder="0"
                        className="field num !px-2 text-right"
                        value={exactText[m.id] ?? ""}
                        onChange={(e) => setExactText((current) => ({ ...current, [m.id]: e.target.value }))}
                      />
                    </div>
                  )}

                  {checked && mode === "shares" && (
                    <div className="flex shrink-0 items-center">
                      <button type="button" aria-label={`Fewer shares for ${m.name}`} onClick={() => bumpShares(m.id, -1)} className="btn-ghost !h-11 !w-11 !px-0">
                        <MinusIcon width={18} height={18} aria-hidden="true" />
                      </button>
                      <span className="num w-6 text-center text-base font-semibold">{sharesCount[m.id] ?? 1}</span>
                      <button type="button" aria-label={`More shares for ${m.name}`} onClick={() => bumpShares(m.id, 1)} className="btn-ghost !h-11 !w-11 !px-0">
                        <PlusIcon width={18} height={18} aria-hidden="true" />
                      </button>
                    </div>
                  )}

                  {checked && mode === "equal" && (
                    <span className="num min-w-20 shrink-0 whitespace-nowrap text-right text-sm text-muted">
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
                className={`num text-sm font-medium ${exactProblem || exactLeft < 0 ? "text-negative" : exactLeft === 0 && amountPaise ? "text-positive" : "text-muted"}`}
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
              <button type="button" className="btn-ghost !px-3" onClick={fillExactEvenly} disabled={!amountPaise || selected.size === 0}>
                Fill evenly
              </button>
            </div>
          )}

          {mode === "shares" && preview && (
            <p className="num mt-3 text-sm text-muted">
              {splits.reduce((sum, s) => sum + s.weight, 0)} shares in total, previewed per person above.
            </p>
          )}
        </div>
      </div>

      <div className="save-bar">
        <div className="mx-auto max-w-[720px]">
          {(shownProblem || serverError) && (
            <p role="alert" className="mb-2 text-sm font-medium text-negative">
              {serverError ?? shownProblem}
            </p>
          )}
          <button type="button" onClick={submit} disabled={pending} className="btn-primary w-full !min-h-12 text-base">
            {pending ? "Saving…" : initial ? "Save changes" : "Add expense"}
            {!pending && amountPaise ? ` · ${formatINR(amountPaise)}` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
