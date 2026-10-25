"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, useTransition, type ReactNode } from "react";
import { chooseIdentityAction, joinAsNewMemberAction } from "@/app/t/[slug]/actions";
import { Avatar } from "./avatar";
import { Sheet } from "./sheet";
import { isExpenseFormRoute, tripSubpath } from "./trip-paths";

export interface IdentityMember {
  id: string;
  name: string;
  color: string;
}

interface IdentityContextValue {
  currentMemberId: string | null;
  /** Returns true when the visitor has picked who they are; otherwise opens the picker and returns false. */
  requireIdentity: () => boolean;
}

const IdentityContext = createContext<IdentityContextValue>({ currentMemberId: null, requireIdentity: () => false });

export function useIdentity(): IdentityContextValue {
  return useContext(IdentityContext);
}

export function IdentityProvider({
  slug,
  members,
  currentMemberId,
  children,
}: {
  slug: string;
  members: IdentityMember[];
  currentMemberId: string | null;
  children: ReactNode;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const requireIdentity = useCallback(() => {
    if (currentMemberId) return true;
    setPickerOpen(true);
    return false;
  }, [currentMemberId]);

  const value = useMemo(() => ({ currentMemberId, requireIdentity }), [currentMemberId, requireIdentity]);

  return (
    <IdentityContext.Provider value={value}>
      {children}
      {pickerOpen && !currentMemberId && (
        <Sheet title="Who are you?" onClose={() => setPickerOpen(false)}>
          <p className="mb-3 text-sm text-muted">Pick your name to vote and react. This is remembered on this phone only.</p>
          <IdentityPicker slug={slug} members={members} onDone={() => setPickerOpen(false)} />
        </Sheet>
      )}
    </IdentityContext.Provider>
  );
}

export function IdentityPicker({
  slug,
  members,
  onDone,
  scrollRow = false,
}: {
  slug: string;
  members: IdentityMember[];
  onDone?: () => void;
  /** Single horizontally scrolling row (compact banner) instead of wrapping chips. */
  scrollRow?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Re-render the server tree so the layout sees the new cookie and drops the "Who are you?" banner right away.
  function finish() {
    router.refresh();
    onDone?.();
  }

  function choose(memberId: string) {
    setError(null);
    startTransition(async () => {
      const result = await chooseIdentityAction(slug, memberId);
      if (result?.error) setError(result.error);
      else finish();
    });
  }

  function join() {
    setError(null);
    startTransition(async () => {
      const result = await joinAsNewMemberAction(slug, name);
      if (result?.error) setError(result.error);
      else finish();
    });
  }

  return (
    <div className={pending ? "opacity-60" : ""}>
      <div className={scrollRow ? "chip-row -mx-4 flex gap-2 px-4" : "flex flex-wrap gap-2"}>
        {members.map((m) => (
          <button key={m.id} type="button" disabled={pending} onClick={() => choose(m.id)} className="chip shrink-0 !pl-2">
            <Avatar name={m.name} color={m.color} size="sm" />
            {m.name}
          </button>
        ))}
        <button type="button" onClick={() => setAdding((v) => !v)} data-active={adding} className="chip shrink-0 border-dashed text-muted">
          I&apos;m not on the list
        </button>
      </div>
      {adding && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            join();
          }}
        >
          <input
            className="field"
            placeholder="Your name"
            aria-label="Your name"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={pending || !name.trim()} className="btn-primary shrink-0">
            Join
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

export function IdentityBanner({ slug, members }: { slug: string; members: IdentityMember[] }) {
  // The expense form pages default "Paid by" to the current member instead of nagging for a name.
  if (isExpenseFormRoute(tripSubpath(usePathname(), slug))) return null;
  return (
    <section className="card mb-4 overflow-hidden border-accent/50 bg-accent-soft/60 px-4 py-3" aria-label="Who are you?">
      <h2 className="mb-2 text-sm font-bold">
        Who are you? <span className="font-medium text-muted">Tap your name to vote and pay as yourself.</span>
      </h2>
      <IdentityPicker slug={slug} members={members} scrollRow />
    </section>
  );
}
