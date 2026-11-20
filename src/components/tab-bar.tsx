"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartIcon, MapIcon, MarkIcon, ScaleIcon, UsersIcon, WalletIcon } from "./icons";
import { isExpenseFormRoute, tripSubpath } from "./trip-paths";

const TABS = [
  { segment: "", label: "Plan", Icon: MapIcon },
  { segment: "expenses", label: "Expenses", Icon: WalletIcon },
  { segment: "settle", label: "Settle", Icon: ScaleIcon },
  { segment: "summary", label: "Summary", Icon: ChartIcon },
  { segment: "people", label: "People", Icon: UsersIcon },
] as const;

/**
 * One nav, two shapes. Below 1024px: an opaque bottom bar of five icon tabs. From 1024px: a 240px
 * labelled sidebar on the ground colour (the first column of the trip layout grid), carrying the brand.
 */
export function TabBar({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/t/${slug}`;
  const rest = tripSubpath(pathname, slug);
  const current = rest.split("/")[0];

  // The expense form owns the bottom edge with its own save bar, but the sidebar stays on desktop.
  const hiddenOnPhone = isExpenseFormRoute(rest) ? "max-lg:hidden" : "";

  return (
    <nav
      aria-label="Trip sections"
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] max-lg:pl-[env(safe-area-inset-left)] max-lg:pr-[env(safe-area-inset-right)] lg:sticky lg:inset-x-auto lg:top-0 lg:bottom-auto lg:h-dvh lg:self-start lg:border-t-0 lg:bg-transparent lg:px-4 lg:pb-0 ${hiddenOnPhone}`}
    >
      <Link href="/" className="hidden h-14 items-center gap-2 px-3 text-base font-semibold lg:flex">
        <MarkIcon className="text-accent" />
        Tripsplit
      </Link>
      <ul className="mx-auto grid max-w-[720px] grid-cols-5 lg:mt-2 lg:flex lg:max-w-none lg:flex-col lg:gap-1">
        {TABS.map(({ segment, label, Icon }) => {
          const active = current === segment;
          return (
            <li key={label}>
              <Link
                href={segment ? `${base}/${segment}` : base}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors lg:min-h-10 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-full lg:px-3 lg:text-sm ${
                  active
                    ? "font-semibold text-text lg:bg-active"
                    : "font-medium text-muted hover:text-text lg:hover:bg-active/60"
                }`}
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors lg:h-auto lg:w-auto ${
                    active ? "bg-active lg:bg-transparent" : ""
                  }`}
                >
                  <Icon className="h-[22px] w-[22px] lg:h-4 lg:w-4" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
