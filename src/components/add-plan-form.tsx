"use client";

import { useState, useTransition } from "react";
import { addPlanItemAction } from "@/app/t/[slug]/actions";
import { PlusIcon } from "./icons";

/** Sits at the foot of a day card: a button that opens the form in place. `dayLabel` reads "Day 1" or "this day". */
export function AddPlanForm({ slug, day, dayLabel }: { slug: string; day: string; dayLabel: string }) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [isOption, setIsOption] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTime("");
    setTitle("");
    setNotes("");
    setIsOption(false);
    setError(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addPlanItemAction(slug, { day, time, title, notes, isOption });
      if (result?.error) {
        setError(result.error);
        return;
      }
      reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <div className="border-t border-rule p-3">
        <button type="button" onClick={() => setOpen(true)} className="btn-secondary w-full sm:w-auto">
          <PlusIcon width={18} height={18} />
          Add to {dayLabel}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 border-t border-rule p-4">
      <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3">
        <div>
          <label className="label" htmlFor={`time-${day}`}>
            Time
          </label>
          <input id={`time-${day}`} type="time" className="field" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor={`title-${day}`}>
            Place
          </label>
          <input
            id={`title-${day}`}
            className="field"
            placeholder="Where to?"
            value={title}
            maxLength={120}
            autoComplete="off"
            enterKeyHint="next"
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`notes-${day}`}>
          Notes
        </label>
        <input id={`notes-${day}`} className="field" placeholder="Optional" autoComplete="off" enterKeyHint="done" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {/* Native checkbox: accent-color (global) keeps the fill and tick legible in both themes. */}
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
        <input type="checkbox" className="h-5 w-5 shrink-0" checked={isOption} onChange={(e) => setIsOption(e.target.checked)} />
        This is an option to vote on
      </label>
      {error && (
        <p role="alert" className="text-sm font-semibold text-negative">
          {error}
        </p>
      )}
      <div className="flex gap-2 lg:justify-end">
        <button
          type="button"
          className="btn-secondary flex-1 lg:flex-none"
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          Cancel
        </button>
        <button type="submit" disabled={pending || !title.trim()} className="btn-primary flex-1 lg:flex-none lg:px-8">
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
    </form>
  );
}
