"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "./avatar";
import { ChevronLeftIcon, MarkIcon } from "./icons";
import { ShareButton } from "./share-button";
import { isExpenseFormRoute, tripSubpath } from "./trip-paths";

/** The product mark and wordmark. Hidden from lg up, where the sidebar carries the brand instead. */
function Brand() {
  return (
    <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-base font-semibold lg:hidden">
      <MarkIcon className="text-accent" />
      Tripsplit
    </Link>
  );
}

export function TripHeader({
  slug,
  name,
  dateRange,
  baseLocation,
  memberCount,
  me,
}: {
  slug: string;
  name: string;
  dateRange: string;
  baseLocation: string;
  memberCount: number;
  me: { name: string; color: string } | null;
}) {
  // Add/edit expense pages get a slim bar (back + title) so the form starts higher on a phone.
  if (isExpenseFormRoute(tripSubpath(usePathname(), slug))) {
    return (
      <header className="pt-[env(safe-area-inset-top)]">
        <div className="trip-column flex h-14 items-center gap-1">
          <Link
            href={`/t/${slug}/expenses`}
            aria-label="Back to expenses"
            className="btn-ghost -ml-3 !w-11 shrink-0 !px-0"
          >
            <ChevronLeftIcon />
          </Link>
          <p className="min-w-0 truncate text-base font-semibold">{name}</p>
        </div>
      </header>
    );
  }

  return (
    <header className="pt-[env(safe-area-inset-top)]">
      <div className="trip-column flex h-14 items-center">
        <Brand />
        <div className="ml-auto">
          <ShareButton slug={slug} tripName={name} />
        </div>
      </div>
      <div className="trip-column pt-2">
        <h1 className="text-title [overflow-wrap:anywhere]">{name}</h1>
        <p className="mt-1 text-sm text-muted [overflow-wrap:anywhere]">
          {dateRange} · {baseLocation} · {memberCount} {memberCount === 1 ? "person" : "people"}
        </p>
        {me && (
          <Link
            href={`/t/${slug}/people`}
            className="mt-3 inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-control bg-surface py-1 pl-1.5 pr-3.5 text-sm font-medium transition-colors hover:bg-raised"
          >
            <Avatar name={me.name} color={me.color} size="sm" />
            <span className="min-w-0 truncate" title={me.name}>You: {me.name}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
