"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartIcon, MapIcon, ScaleIcon, UsersIcon, WalletIcon } from "./icons";
import { isExpenseFormRoute, tripSubpath } from "./trip-paths";

const TABS = [
  { segment: "", label: "Plan", Icon: MapIcon },
  { segment: "expenses", label: "Expenses", Icon: WalletIcon },
  { segment: "settle", label: "Settle", Icon: ScaleIcon },
  { segment: "summary", label: "Summary", Icon: ChartIcon },
  { segment: "people", label: "People", Icon: UsersIcon },
] as const;

export function TabBar({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/t/${slug}`;
  const rest = tripSubpath(pathname, slug);
  const current = rest.split("/")[0];

  // The expense form owns the bottom edge with its own save bar.
  if (isExpenseFormRoute(rest)) return null;

  return (
    <nav
      aria-label="Trip sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-[640px] grid-cols-5">
        {TABS.map(({ segment, label, Icon }) => {
          const active = current === segment;
          return (
            <li key={label}>
              <Link
                href={segment ? `${base}/${segment}` : base}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition ${
                  active ? "text-primary-deep" : "text-muted"
                }`}
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition ${active ? "bg-primary-soft" : ""}`}
                >
                  <Icon width={22} height={22} />
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
