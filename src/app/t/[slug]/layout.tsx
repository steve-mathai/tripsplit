import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { formatDateRange } from "@/components/dates";
import { IdentityBanner, IdentityProvider } from "@/components/identity";
import { LiveRefresh } from "@/components/live-refresh";
import { ShellSkeleton } from "@/components/skeletons";
import { TabBar } from "@/components/tab-bar";
import { TripHeader } from "@/components/trip-header";
import { getTripBySlug } from "@/db/queries";
import { getCurrentMemberId } from "./identity";

export async function generateMetadata({ params }: LayoutProps<"/t/[slug]">): Promise<Metadata> {
  await connection(); // DB read: request time only
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip) return { title: "Trip not found" };
  const description = `${formatDateRange(trip.startDate, trip.endDate)} · ${trip.baseLocation} · ${trip.members.length} friends. Plan the days and split the bill on Tripsplit.`;
  return {
    title: trip.name,
    description,
    openGraph: { title: `Join our trip ${trip.name} on Tripsplit`, description, type: "website" },
    robots: { index: false },
  };
}

export default function TripLayout({ children, params }: LayoutProps<"/t/[slug]">) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <TripShell params={params}>{children}</TripShell>
    </Suspense>
  );
}

async function TripShell({ params, children }: { params: LayoutProps<"/t/[slug]">["params"]; children: ReactNode }) {
  await connection();
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip) notFound();

  const currentMemberId = await getCurrentMemberId(trip);
  const me = trip.members.find((m) => m.id === currentMemberId);
  const identityMembers = trip.members.map((m) => ({ id: m.id, name: m.name, color: m.color }));

  return (
    /*
     * Responsive shell. Phone: one column, bottom tab bar. 640-1023px: the column is centred at 720px,
     * tab bar kept. From 1024px (lg): a grid of [240px sidebar | canvas], the canvas holding up to
     * 1100px of content. Screens go two-column at lg with the `wide-2col` / `wide-2col-aside`
     * utilities (or plain `lg:` classes); the canvas is `.trip-column`, so they never need a max-width.
     */
    <div className="min-h-dvh lg:grid lg:grid-cols-[var(--sidebar-w)_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-[calc(env(safe-area-inset-top)+0.75rem)] focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-fg"
      >
        Skip to content
      </a>
      <LiveRefresh />
      <TabBar slug={trip.slug} />
      <div className="min-w-0 pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+1.5rem)] lg:pb-12">
        <TripHeader
          slug={trip.slug}
          name={trip.name}
          dateRange={formatDateRange(trip.startDate, trip.endDate)}
          baseLocation={trip.baseLocation}
          memberCount={trip.members.length}
          me={me ? { name: me.name, color: me.color } : null}
        />

        <main id="main-content" className="trip-column pt-4 lg:pt-6">
          <IdentityProvider slug={trip.slug} members={identityMembers} currentMemberId={currentMemberId}>
            {!currentMemberId && <IdentityBanner slug={trip.slug} members={identityMembers} />}
            {children}
          </IdentityProvider>
        </main>
      </div>
    </div>
  );
}
