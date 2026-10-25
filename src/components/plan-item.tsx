"use client";

import { useOptimistic, useState, useTransition } from "react";
import { deletePlanItemAction, lockInAction, reactAction, voteAction } from "@/app/t/[slug]/actions";
import { EMOJIS, type Emoji, type PlanKind, type Vote } from "@/lib/types";
import { formatTime12 } from "./dates";
import { LockIcon, SmilePlusIcon, ThumbDownIcon, ThumbUpIcon, TrashIcon } from "./icons";
import { useIdentity } from "./identity";

export interface PlanItemView {
  id: string;
  time: string | null;
  title: string;
  notes: string | null;
  kind: PlanKind;
  upMemberIds: string[];
  downMemberIds: string[];
  reactions: { emoji: Emoji; memberIds: string[] }[];
}

type Change = { type: "vote"; memberId: string; value: Vote | null } | { type: "emoji"; memberId: string; emoji: Emoji | null };

/** Applies a member's vote/emoji change locally so taps feel instant while the server action runs. */
function applyChange(item: PlanItemView, change: Change): PlanItemView {
  if (change.type === "vote") {
    const without = (ids: string[]) => ids.filter((id) => id !== change.memberId);
    return {
      ...item,
      upMemberIds: change.value === "up" ? [...without(item.upMemberIds), change.memberId] : without(item.upMemberIds),
      downMemberIds: change.value === "down" ? [...without(item.downMemberIds), change.memberId] : without(item.downMemberIds),
    };
  }
  return {
    ...item,
    reactions: EMOJIS.map((emoji) => {
      const existing = item.reactions.find((r) => r.emoji === emoji)?.memberIds ?? [];
      const others = existing.filter((id) => id !== change.memberId);
      return { emoji, memberIds: change.emoji === emoji ? [...others, change.memberId] : others };
    }).filter((r) => r.memberIds.length > 0),
  };
}

export function PlanItemCard({
  slug,
  item,
  memberNames,
}: {
  slug: string;
  item: PlanItemView;
  memberNames: Record<string, string>;
}) {
  const { currentMemberId, requireIdentity } = useIdentity();
  const [optimisticItem, addOptimistic] = useOptimistic(item, applyChange);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const isOption = optimisticItem.kind === "option";
  const myVote: Vote | null =
    currentMemberId && optimisticItem.upMemberIds.includes(currentMemberId)
      ? "up"
      : currentMemberId && optimisticItem.downMemberIds.includes(currentMemberId)
        ? "down"
        : null;
  const myEmoji = currentMemberId
    ? (optimisticItem.reactions.find((r) => r.memberIds.includes(currentMemberId))?.emoji ?? null)
    : null;

  const namesOf = (ids: string[]) => ids.map((id) => memberNames[id] ?? "Someone").join(", ");

  function run(change: Change | null, action: () => Promise<{ error: string } | undefined>) {
    setError(null);
    startTransition(async () => {
      if (change) addOptimistic(change);
      const result = await action();
      if (result?.error) setError(result.error);
    });
  }

  function vote(value: Vote) {
    if (!requireIdentity() || !currentMemberId) return;
    const next = myVote === value ? null : value;
    run({ type: "vote", memberId: currentMemberId, value: next }, () => voteAction(slug, item.id, next));
  }

  function react(emoji: Emoji) {
    if (!requireIdentity() || !currentMemberId) return;
    const next = myEmoji === emoji ? null : emoji;
    setPicking(false);
    run({ type: "emoji", memberId: currentMemberId, emoji: next }, () => reactAction(slug, item.id, next));
  }

  function lockIn() {
    run(null, () => lockInAction(slug, item.id));
  }

  function remove() {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    run(null, () => deletePlanItemAction(slug, item.id));
  }

  return (
    <li className={`card relative p-4 ${isOption ? "border-accent/60 bg-accent-soft/30" : ""} ${pending ? "opacity-80" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="w-16 shrink-0 pt-0.5 text-sm font-bold tabular-nums text-primary-deep">
          {optimisticItem.time ? formatTime12(optimisticItem.time) : <span className="font-medium text-muted">Any time</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isOption && (
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-[#3a2200]">
                Option
              </span>
            )}
            <h3 className="text-base font-bold leading-snug">{optimisticItem.title}</h3>
          </div>
          {optimisticItem.notes && <p className="mt-1 text-sm text-muted">{optimisticItem.notes}</p>}
        </div>
        <button type="button" onClick={remove} aria-label={`Delete ${item.title}`} className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:text-bad">
          <TrashIcon width={18} height={18} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isOption && (
          <>
            <button
              type="button"
              aria-pressed={myVote === "up"}
              aria-label={`Vote yes, ${optimisticItem.upMemberIds.length} so far`}
              data-active={myVote === "up"}
              title={namesOf(optimisticItem.upMemberIds)}
              onClick={() => vote("up")}
              className="chip !px-3 data-[active=true]:!border-good data-[active=true]:!bg-good-soft data-[active=true]:!text-good"
            >
              <ThumbUpIcon width={18} height={18} />
              <span className="tabular-nums">{optimisticItem.upMemberIds.length}</span>
            </button>
            <button
              type="button"
              aria-pressed={myVote === "down"}
              aria-label={`Vote no, ${optimisticItem.downMemberIds.length} so far`}
              data-active={myVote === "down"}
              title={namesOf(optimisticItem.downMemberIds)}
              onClick={() => vote("down")}
              className="chip !px-3 data-[active=true]:!border-bad data-[active=true]:!bg-bad-soft data-[active=true]:!text-bad"
            >
              <ThumbDownIcon width={18} height={18} />
              <span className="tabular-nums">{optimisticItem.downMemberIds.length}</span>
            </button>
          </>
        )}
        {/* Only reactions someone has made show as chips; the rest hide behind the add-reaction button. */}
        {optimisticItem.reactions.map((reaction) => (
          <button
            key={reaction.emoji}
            type="button"
            aria-pressed={myEmoji === reaction.emoji}
            aria-label={`React ${reaction.emoji}`}
            data-active={myEmoji === reaction.emoji}
            title={namesOf(reaction.memberIds)}
            onClick={() => react(reaction.emoji)}
            className="chip !px-2"
          >
            <span className="text-base leading-none">{reaction.emoji}</span>
            <span className="text-xs font-bold tabular-nums">{reaction.memberIds.length}</span>
          </button>
        ))}
        <button
          type="button"
          aria-expanded={picking}
          aria-label="Add reaction"
          data-active={picking}
          onClick={() => setPicking((open) => !open)}
          className="chip !w-11 !px-0 text-muted"
        >
          <SmilePlusIcon width={20} height={20} />
        </button>
      </div>

      {picking && (
        <div className="mt-2 flex gap-1.5" role="group" aria-label="Pick a reaction">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-pressed={myEmoji === emoji}
              aria-label={`React ${emoji}`}
              data-active={myEmoji === emoji}
              onClick={() => react(emoji)}
              className="chip !px-0 w-11 text-xl"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {isOption && (
        <button type="button" onClick={lockIn} disabled={pending} className="btn-soft mt-3 w-full">
          <LockIcon width={18} height={18} />
          Lock it in
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-bad">
          {error}
        </p>
      )}
    </li>
  );
}
