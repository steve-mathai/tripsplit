"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "./avatar";
import { PinIcon } from "./icons";
import { ShareButton } from "./share-button";
import { isExpenseFormRoute, tripSubpath } from "./trip-paths";

export function TripHeader({
  slug,
  name,
  dateRange,
  baseLocation,
  me,
}: {
  slug: string;
  name: string;
  dateRange: string;
  baseLocation: string;
  me: { name: string; color: string } | null;
}) {
  // Add/edit expense pages get a slim bar so the form starts higher on a phone.
  if (isExpenseFormRoute(tripSubpath(usePathname(), slug))) {
    return (
      <header className="rounded-b-2xl bg-hero px-4 pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto flex h-14 max-w-[640px] items-center">
          <Link href={`/t/${slug}`} className="truncate font-display text-lg font-semibold tracking-tight">
            {name}
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="relative overflow-hidden bg-hero px-4 pb-9 pt-[calc(1rem+env(safe-area-inset-top))] text-white">
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full text-paper" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 22c40 0 40-14 80-14s40 14 80 14 40-14 80-14 40 14 80 14 40-14 80-14v32H0z" fill="currentColor" />
      </svg>
      <div className="pointer-events-none absolute -right-8 -top-14 h-36 w-36 rounded-full bg-accent/90" aria-hidden="true" />
      <div className="relative mx-auto max-w-[640px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link href="/" className="min-h-11 content-center font-display text-lg font-semibold tracking-tight text-white/90">
            Tripsplit
          </Link>
          <ShareButton slug={slug} tripName={name} />
        </div>
        <h1 className="font-display text-[1.9rem] font-semibold leading-tight">{name}</h1>
        <p className="mt-1 text-sm font-medium text-white/85">{dateRange}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-white/80">
          <span className="inline-flex items-center gap-1.5">
            <PinIcon width={16} height={16} />
            {baseLocation}
          </span>
          {me && (
            <Link href={`/t/${slug}/people`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/15 py-1 pl-1.5 pr-3 text-white ring-1 ring-white/25">
              <Avatar name={me.name} color={me.color} size="sm" />
              <span className="text-xs font-semibold">You: {me.name}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
