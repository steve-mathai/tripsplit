import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { CardSkeleton } from "@/components/skeletons";
import { SettleAllActions, TransferCard, type SettleLine } from "@/components/settle-cards";
import { getExpenses, getTripBySlug } from "@/db/queries";
import { computeBalances } from "@/lib/balances";
import { formatINR } from "@/lib/money";
import { minimumTransfers } from "@/lib/settle";
import { toMathsExpenses } from "../maths-input";

export const metadata = { title: "Settle up" };

export default function SettlePage({ params }: PageProps<"/t/[slug]/settle">) {
  return (
    <Suspense fallback={<CardSkeleton count={4} height="h-16" />}>
      <SettleContent params={params} />
    </Suspense>
  );
}

async function SettleContent({ params }: { params: PageProps<"/t/[slug]/settle">["params"] }) {
  await connection();
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip) notFound();
  const expenses = await getExpenses(trip.id);

  const balances = computeBalances(trip.members, toMathsExpenses(expenses));
  const transfers = minimumTransfers(balances);
  const memberById = new Map(trip.members.map((m) => [m.id, m]));
  const party = (id: string) => {
    const m = memberById.get(id)!;
    return { id: m.id, name: m.name, color: m.color, upiId: m.upiId };
  };
  const lines: SettleLine[] = transfers.map((t) => ({ from: party(t.from), to: party(t.to), amountPaise: t.amountPaise }));
  const sorted = [...balances].sort((a, b) => b.net - a.net || party(a.memberId).name.localeCompare(party(b.memberId).name));

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">Balances</h2>
        <ul className="card divide-y divide-line overflow-hidden">
          {sorted.map((b) => {
            const m = party(b.memberId);
            return (
              <li key={b.memberId} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
                <Avatar name={m.name} color={m.color} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-bold">{m.name}</p>
                    {b.net > 0 ? (
                      <span className="shrink-0 whitespace-nowrap rounded-full bg-good-soft px-2.5 py-1 text-sm font-bold tabular-nums text-good">gets back {formatINR(b.net)}</span>
                    ) : b.net < 0 ? (
                      <span className="shrink-0 whitespace-nowrap rounded-full bg-bad-soft px-2.5 py-1 text-sm font-bold tabular-nums text-bad">owes {formatINR(-b.net)}</span>
                    ) : (
                      <span className="shrink-0 whitespace-nowrap rounded-full bg-card-soft px-2.5 py-1 text-sm font-semibold text-muted">settled up</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs tabular-nums text-muted">
                    Paid {formatINR(b.paid)} · Share {formatINR(b.owed)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">
          {lines.length === 0
            ? "Everyone is settled up"
            : `${lines.length} ${lines.length === 1 ? "payment settles" : "payments settle"} everyone`}
        </h2>
        {lines.length > 0 && (
          <>
            <ul className="space-y-2">
              {lines.map((line) => (
                <TransferCard key={`${line.from.id}-${line.to.id}`} line={line} tripName={trip.name} />
              ))}
            </ul>
            <SettleAllActions lines={lines} tripName={trip.name} />
            <p className="mt-4 text-sm text-muted">
              This is the fewest payments that clear every balance, so nobody pays twice. The &ldquo;Pay via UPI&rdquo; button appears when the
              person receiving has added a UPI id on the People tab.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
