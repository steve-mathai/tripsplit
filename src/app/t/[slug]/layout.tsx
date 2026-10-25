import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { formatDateRange } from "@/components/dates";
import { IdentityBanner, IdentityProvider } from "@/components/identity";
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
    <div className="min-h-dvh pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+1.5rem)]">
      <TripHeader
        slug={trip.slug}
        name={trip.name}
        dateRange={formatDateRange(trip.startDate, trip.endDate)}
        baseLocation={trip.baseLocation}
        me={me ? { name: me.name, color: me.color } : null}
      />

      <main className="mx-auto max-w-[640px] px-4 pt-4">
        <IdentityProvider slug={trip.slug} members={identityMembers} currentMemberId={currentMemberId}>
          {!currentMemberId && <IdentityBanner slug={trip.slug} members={identityMembers} />}
          {children}
        </IdentityProvider>
      </main>
      <TabBar slug={trip.slug} />
    </div>
  );
}
