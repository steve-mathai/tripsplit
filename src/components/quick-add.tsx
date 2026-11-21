"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveExpenseAction } from "@/app/t/[slug]/actions";
import { formatINR } from "@/lib/money";
import { buildPrefillQuery, parseQuickAdd, type QuickAddMember } from "@/lib/quick-add";
import { Avatar } from "./avatar";
import { useIdentity } from "./identity";

export interface QuickAddPerson extends QuickAddMember {
  color: string;
}

const UNCLEAR_MESSAGE = {
  "no-amount": "No amount found.",
  "many-amounts": "More than one amount found.",
  "many-payers": "More than one name found.",
  "no-description": "What was it for?",
  "long-description": "The description is over 80 characters.",
} as const;

/**
 * One text box above the expense list: "450 chai Meera". Shows what it understood and saves on one tap through
 * the same saveExpenseAction as the full form. Anything unclear opens the full form with the understood parts filled in.
 */
export function QuickAdd({ slug, members, defaultDay }: { slug: string; members: QuickAddPerson[]; defaultDay: string | null }) {
  const router = useRouter();
  const { currentMemberId } = useIdentity();
  const [text, setText] = useState("");
  // Who paid, picked from the inline list when the text names no one and this phone has no identity.
  const [pickedPayer, setPickedPayer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingLine, setSavingLine] = useState("");
  const [pending, startTransition] = useTransition();

  const parsed = useMemo(() => parseQuickAdd(text, members, currentMemberId), [text, members, currentMemberId]);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "Someone";

  // A picked payer only completes a "needs-payer" result; any edit to the text starts over.
  const ready =
    parsed.status === "ready"
      ? parsed
      : parsed.status === "needs-payer" && pickedPayer
        ? { ...parsed, status: "ready" as const, paidBy: pickedPayer }
        : null;

  function onTextChange(value: string) {
    setText(value);
    setPickedPayer(null);
    setError(null);
  }

  function openFullForm() {
    const paidBy = ready?.paidBy ?? (parsed.status === "unclear" ? parsed.paidBy : null);
    router.push(`/t/${slug}/expenses/new?${buildPrefillQuery({ ...parsed, paidBy })}`);
  }

  function save() {
    if (!ready || pending) return;
    const typed = text;
    setSavingLine(`Adding ${formatINR(ready.amountPaise)} for ${ready.description}`);
    setError(null);
    setText("");
    setPickedPayer(null);
    startTransition(async () => {
      const result = await saveExpenseAction(slug, null, {
        description: ready.description,
        amountPaise: ready.amountPaise,
        category: "food",
        paidBy: ready.paidBy,
        day: defaultDay,
        mode: "equal",
        splits: members.map((m) => ({ memberId: m.id, weight: 1 })),
      });
      // A success redirects, so only a failure comes back here: put the text back so nothing is lost.
      if (result?.error) {
        setText(typed);
        setError(result.error);
      }
    });
  }

  const hasText = text.trim() !== "";

  return (
    // data-refresh-hold: live refresh waits while this box has text or a save is running.
    <section className="card mb-4 p-4" aria-label="Quick add" data-refresh-hold={hasText || pending ? "" : undefined}>
      <label className="label" htmlFor="quick-add">
        Quick add
      </label>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) save();
          else if (hasText && parsed.status === "unclear") openFullForm();
        }}
      >
        <input
          id="quick-add"
          name="quick-add"
          className="field min-w-0 flex-1"
          placeholder="450 chai Meera"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
          value={text}
          maxLength={160}
          disabled={pending}
          onChange={(e) => onTextChange(e.target.value)}
          aria-describedby="quick-add-preview"
        />
        {ready && (
          <button type="submit" disabled={pending} className="btn-primary shrink-0">
            Add
          </button>
        )}
      </form>

      <div id="quick-add-preview" aria-live="polite">
        {pending && <p className="mt-2 text-sm text-muted">{savingLine}…</p>}

        {!pending && ready && (
          <p className="mt-2 text-sm">
            <span className="num font-semibold">{formatINR(ready.amountPaise)}</span> for {ready.description}, paid by{" "}
            <span className="font-semibold">{nameOf(ready.paidBy)}</span>. Food, split equally among {members.length}.
          </p>
        )}

        {!pending && hasText && parsed.status === "needs-payer" && !pickedPayer && (
          <div className="mt-2">
            <p className="text-sm">
              <span className="num font-semibold">{formatINR(parsed.amountPaise)}</span> for {parsed.description}. Who paid?
            </p>
            <div className="chip-row -mx-4 mt-2 flex gap-2 px-4" role="group" aria-label="Who paid">
              {members.map((m) => (
                <button key={m.id} type="button" className="chip max-w-[85vw] shrink-0 !justify-start !pl-1.5" onClick={() => setPickedPayer(m.id)}>
                  <Avatar name={m.name} color={m.color} size="sm" />
                  <span className="min-w-0 truncate">{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!pending && hasText && parsed.status === "unclear" && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 text-sm text-muted">{UNCLEAR_MESSAGE[parsed.reason]} Finish it in the full form.</p>
            <button type="button" className="btn-secondary shrink-0" onClick={openFullForm}>
              Open full form
            </button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-negative">
          {error}
        </p>
      )}
    </section>
  );
}
