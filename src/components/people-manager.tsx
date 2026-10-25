"use client";

import { useState, useTransition } from "react";
import { addMemberAction, chooseIdentityAction, removeMemberAction, updateUpiAction } from "@/app/t/[slug]/actions";
import { Avatar } from "./avatar";
import { CheckIcon, PlusIcon, TrashIcon } from "./icons";

export interface PersonRow {
  id: string;
  name: string;
  color: string;
  upiId: string | null;
  canRemove: boolean;
}

function PersonCard({ slug, person, isMe }: { slug: string; person: PersonRow; isMe: boolean }) {
  const [upi, setUpi] = useState(person.upiId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const changed = upi.trim() !== (person.upiId ?? "");

  function run(work: () => Promise<{ error: string } | undefined>) {
    setError(null);
    startTransition(async () => {
      const result = await work();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <li className={`card p-4 ${pending ? "opacity-70" : ""} ${isMe ? "border-primary ring-1 ring-primary/40" : ""}`}>
      <div className="flex items-center gap-3">
        <Avatar name={person.name} color={person.color} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{person.name}</p>
          {isMe && <p className="text-xs font-bold text-primary-deep">This is you</p>}
        </div>
        {!isMe && (
          <button type="button" className="btn-soft !px-4" disabled={pending} onClick={() => run(() => chooseIdentityAction(slug, person.id))}>
            This is me
          </button>
        )}
        {person.canRemove && (
          <button
            type="button"
            aria-label={`Remove ${person.name}`}
            className="btn-ghost !h-11 !w-11 !px-0 text-muted"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Remove ${person.name} from the trip?`)) run(() => removeMemberAction(slug, person.id));
            }}
          >
            <TrashIcon width={18} height={18} />
          </button>
        )}
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => updateUpiAction(slug, person.id, upi));
        }}
      >
        <input
          className="field"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="UPI id (name@bank) - optional"
          aria-label={`UPI id for ${person.name}`}
          value={upi}
          onChange={(e) => setUpi(e.target.value)}
        />
        {changed && (
          <button type="submit" className="btn-primary shrink-0" disabled={pending}>
            <CheckIcon width={18} height={18} />
            Save
          </button>
        )}
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-bad">
          {error}
        </p>
      )}
    </li>
  );
}

export function PeopleManager({ slug, people, currentMemberId }: { slug: string; people: PersonRow[]; currentMemberId: string | null }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addMemberAction(slug, name);
      if (result?.error) setError(result.error);
      else setName("");
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Add a UPI id so friends can pay you straight from the Settle tab. Names can only be removed before they appear in any expense.
      </p>
      <ul className="space-y-3">
        {people.map((person) => (
          <PersonCard key={person.id} slug={slug} person={person} isMe={person.id === currentMemberId} />
        ))}
      </ul>

      <form onSubmit={add} className="card p-4">
        <label className="label" htmlFor="new-member">
          Add someone
        </label>
        <div className="flex gap-2">
          <input id="new-member" className="field" placeholder="Name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="btn-accent shrink-0" disabled={pending || !name.trim()}>
            <PlusIcon width={18} height={18} />
            Add
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm font-semibold text-bad">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
