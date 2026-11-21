"use client";

import { useRef, useState, useTransition } from "react";
import { addMemberAction, chooseIdentityAction, removeMemberAction, updateUpiAction } from "@/app/t/[slug]/actions";
import { Avatar } from "./avatar";
import { PlusIcon } from "./icons";

export interface PersonRow {
  id: string;
  name: string;
  color: string;
  upiId: string | null;
  canRemove: boolean;
}

type Panel = "none" | "edit-upi" | "confirm-remove";

/** Quiet text-button look for the row actions; the 44px height is the hit area, the ring comes from the global focus-visible rule. */
const ACTION_BASE =
  "inline-flex min-h-11 items-center rounded-mark px-3 text-sm font-medium underline-offset-4 hover:underline disabled:opacity-50 disabled:hover:no-underline";
const ACTION_CLASS = `${ACTION_BASE} text-accent-ink`;

function PersonItem({ slug, person, isMe }: { slug: string; person: PersonRow; isMe: boolean }) {
  const [upi, setUpi] = useState(person.upiId ?? "");
  const [panel, setPanel] = useState<Panel>("none");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editButton = useRef<HTMLButtonElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);
  const changed = upi.trim() !== (person.upiId ?? "");

  function run(work: () => Promise<{ error: string } | undefined>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await work();
      if (result?.error) setError(result.error);
      else onSuccess?.();
    });
  }

  function openEditor() {
    setUpi(person.upiId ?? "");
    setPanel("edit-upi");
  }

  function closePanel(returnFocusTo: HTMLButtonElement | null) {
    setPanel("none");
    setError(null);
    returnFocusTo?.focus();
  }

  return (
    <li className={`px-4 py-3 ${pending ? "opacity-70" : ""}`}>
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]">
        <Avatar name={person.name} color={person.color} size="md" />
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="line-clamp-2 min-w-0 text-base font-semibold [overflow-wrap:anywhere]">{person.name}</span>
            {isMe && <span className="pill pill-accent shrink-0">You</span>}
          </p>
          <p className="text-sm text-muted [overflow-wrap:anywhere]">{person.upiId ?? "No UPI id"}</p>
        </div>
        {/* Negative margins pull the 44px-tall actions closer to the UPI line without shrinking their hit area. */}
        <div className="col-start-2 -mb-2 -ml-3 -mt-1 flex flex-wrap sm:col-start-3 sm:row-start-1 sm:m-0">
          {!isMe && (
            <button
              type="button"
              className={ACTION_CLASS}
              disabled={pending}
              onClick={() => run(() => chooseIdentityAction(slug, person.id))}
            >
              This is me
            </button>
          )}
          <button
            ref={editButton}
            type="button"
            className={ACTION_CLASS}
            aria-expanded={panel === "edit-upi"}
            aria-label={`Edit UPI id for ${person.name}`}
            disabled={pending}
            onClick={() => (panel === "edit-upi" ? closePanel(null) : openEditor())}
          >
            Edit UPI id
          </button>
          {person.canRemove && (
            <button
              ref={removeButton}
              type="button"
              className={`${ACTION_BASE} text-negative`}
              aria-label={`Remove ${person.name}`}
              aria-expanded={panel === "confirm-remove"}
              disabled={pending}
              onClick={() => setPanel("confirm-remove")}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {panel === "edit-upi" && (
        <form
          className="mt-3 space-y-2 pl-[3.25rem]"
          onSubmit={(event) => {
            event.preventDefault();
            if (changed) run(() => updateUpiAction(slug, person.id, upi), () => closePanel(editButton.current));
          }}
        >
          <input
            className="field"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            placeholder="name@bank (optional)"
            aria-label={`UPI id for ${person.name}`}
            value={upi}
            onChange={(e) => setUpi(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-secondary" disabled={pending || !changed}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn-ghost" disabled={pending} onClick={() => closePanel(editButton.current)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {panel === "confirm-remove" && (
        <div className="panel mt-3 ml-[3.25rem] p-3" role="group" aria-label={`Confirm removing ${person.name}`}>
          <p className="text-sm [overflow-wrap:anywhere]">Remove {person.name} from the trip?</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="btn-danger"
              disabled={pending}
              onClick={() => run(() => removeMemberAction(slug, person.id))}
            >
              {pending ? "Removing…" : "Remove"}
            </button>
            <button type="button" className="btn-secondary" disabled={pending} autoFocus onClick={() => closePanel(removeButton.current)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 pl-[3.25rem] text-sm font-medium text-negative">
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
      <div>
        <h2 className="text-section">People</h2>
        <p className="mt-1 text-sm text-muted">
          Add a UPI id so friends can pay you straight from the Settle tab. Names can only be removed before they appear in any expense or payment.
        </p>
      </div>

      <div className="wide-2col-aside">
        <ul className="card divide-y divide-rule overflow-hidden">
          {people.map((person) => (
            <PersonItem key={person.id} slug={slug} person={person} isMe={person.id === currentMemberId} />
          ))}
        </ul>

        <form onSubmit={add} className="card p-4">
          <label className="label" htmlFor="new-member">
            Add someone
          </label>
          <div className="flex gap-2">
            <input
              id="new-member"
              name="name"
              className="field"
              placeholder="Name"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="done"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
            />
            <button type="submit" className="btn-primary shrink-0" disabled={pending || !name.trim()}>
              <PlusIcon width={18} height={18} />
              {pending ? "Adding…" : "Add"}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm font-medium text-negative">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
