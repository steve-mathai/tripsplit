"use client";

import { useState, useTransition } from "react";
import { addPlanItemAction } from "@/app/t/[slug]/actions";
import { PlusIcon } from "./icons";

export function AddPlanForm({ slug, day }: { slug: string; day: string }) {
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
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost w-full border-dashed text-primary-deep">
        <PlusIcon width={18} height={18} />
        Add plan
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-4">
      <div className="grid grid-cols-[7.5rem_1fr] gap-3">
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
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`notes-${day}`}>
          Notes
        </label>
        <input id={`notes-${day}`} className="field" placeholder="Optional" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
        <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={isOption} onChange={(e) => setIsOption(e.target.checked)} />
        This is an option to vote on
      </label>
      {error && (
        <p role="alert" className="text-sm font-semibold text-bad">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="button" className="btn-ghost flex-1" onClick={() => { reset(); setOpen(false); }}>
          Cancel
        </button>
        <button type="submit" disabled={pending || !title.trim()} className="btn-primary flex-1">
          {pending ? "Adding..." : "Add"}
        </button>
      </div>
    </form>
  );
}
