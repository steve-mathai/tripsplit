import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { MONEY_TONE_CLASS, signedINR } from "@/components/money-sign";
import { CardSkeleton } from "@/components/skeletons";
import { SettleAllActions, TransferCard, type SettleLine, type SettleParty } from "@/components/settle-cards";
import { getExpenses, getTripBySlug } from "@/db/queries";
import { computeBalances } from "@/lib/balances";
import { formatINR } from "@/lib/money";
import { minimumTransfers } from "@/lib/settle";
import type { Balance } from "@/lib/types";
import { toMathsExpenses } from "../maths-input";

export const metadata = { title: "Settle up" };

export default function SettlePage({ params }: PageProps<"/t/[slug]/settle">) {
  return (
    <Suspense fallback={<CardSkeleton count={4} height="h-16" />}>
      <SettleContent params={params} />
    </Suspense>
  );
}

function spokenBalance(net: number): string {
  if (net > 0) return `Gets back ${formatINR(net)}`;
  if (net < 0) return `Owes ${formatINR(-net)}`;
  return "Settled";
}

/**
 * The balance river: one row per person around a centre zero line. Gets back grows right in the accent,
 * owes grows left in ink, both on one scale (the largest balance). Pure CSS; the table is the accessible twin.
 */
function BalanceRiver({ rows }: { rows: { balance: Balance; person: SettleParty }[] }) {
  const largest = Math.max(1, ...rows.map((r) => Math.abs(r.balance.net)));
  return (
    <div className="card p-4">
      {/* The wrapper is what is clipped: a bare table ignores sr-only's 1px box and widened the whole page on phones. */}
      <div className="sr-only">
      <table>
        <caption>Balance of each person</caption>
        <thead>
          <tr>
            <th scope="col">Person</th>
            <th scope="col">Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ balance, person }) => (
            <tr key={balance.memberId}>
              <th scope="row">{person.name}</th>
              <td>{spokenBalance(balance.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div aria-hidden="true">
        <div className="mb-1 flex justify-between text-sm text-muted">
          <span>Owes</span>
          <span>Gets back</span>
        </div>
        {/* One shared grid (rows are subgrids) so every track lines up on one zero line, whatever width the widest amount needs. */}
        <ul className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto] gap-x-2">
          {rows.map(({ balance, person }) => {
            const { text, tone } = signedINR(balance.net);
            const halfWidth = `${(Math.abs(balance.net) / largest) * 50}%`;
            return (
              <li key={balance.memberId} className="col-span-3 grid min-h-10 grid-cols-subgrid items-center">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <Avatar name={person.name} color={person.color} size="sm" className="!h-6 !w-6 !text-meta" />
                  <span className="truncate">{person.name}</span>
                </span>
                <span className="relative h-3">
                  {balance.net > 0 && (
                    <span className="absolute inset-y-0 left-1/2 min-w-0.5 rounded-r-full bg-accent" style={{ width: halfWidth }} />
                  )}
                  {balance.net < 0 && (
                    <span className="absolute inset-y-0 right-1/2 min-w-0.5 rounded-l-full bg-text/70" style={{ width: halfWidth }} />
                  )}
                  <span className="absolute -top-1 left-1/2 h-5 w-px -translate-x-1/2 bg-control" />
                </span>
                <span className={`num whitespace-nowrap text-right text-sm font-semibold ${MONEY_TONE_CLASS[tone]}`}>{text}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
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
  const party = (id: string): SettleParty => {
    const m = memberById.get(id)!;
    return { id: m.id, name: m.name, color: m.color, upiId: m.upiId };
  };
  const lines: SettleLine[] = transfers.map((t) => ({ from: party(t.from), to: party(t.to), amountPaise: t.amountPaise }));
  const rows = balances
    .map((balance) => ({ balance, person: party(balance.memberId) }))
    .sort((a, b) => b.balance.net - a.balance.net || a.person.name.localeCompare(b.person.name));

  const heading =
    lines.length === 0 ? "Everyone is settled" : `${lines.length} ${lines.length === 1 ? "payment settles" : "payments settle"} everyone`;

  // One sentence built from the data: who is owed most, and the biggest thing they paid for.
  const topCreditor = rows[0] && rows[0].balance.net > 0 ? rows[0] : null;
  let finding: string;
  if (topCreditor) {
    const biggestPaid = expenses
      .filter((e) => e.paidBy === topCreditor.person.id)
      .reduce<(typeof expenses)[number] | null>((best, e) => (!best || e.amountPaise > best.amountPaise ? e : best), null);
    finding = `Most money goes back to ${topCreditor.person.name}, who is owed ${formatINR(topCreditor.balance.net)}${
      biggestPaid ? ` after paying ${formatINR(biggestPaid.amountPaise)} for ${biggestPaid.description}` : ""
    }.`;
  } else {
    finding = expenses.length === 0 ? "No expenses yet, so nobody owes anything." : "Every balance is zero.";
  }

  const balancesDetail = (
    <>
      <h3 className="mb-2 text-sm font-medium text-muted">Paid and share</h3>
      <ul className="card divide-y divide-rule overflow-hidden">
        {rows.map(({ balance, person }) => {
          const { text, tone } = signedINR(balance.net);
          return (
            <li key={balance.memberId} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
              <Avatar name={person.name} color={person.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold" title={person.name}>{person.name}</p>
                <p className="num text-sm text-muted [overflow-wrap:anywhere]">
                  Paid {formatINR(balance.paid)} · Share {formatINR(balance.owed)}
                </p>
              </div>
              <span className={`num shrink-0 text-base font-semibold ${MONEY_TONE_CLASS[tone]}`}>{text}</span>
            </li>
          );
        })}
      </ul>
    </>
  );

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-section">{heading}</h2>
        <p className="mt-1 text-base text-muted [overflow-wrap:anywhere]">{finding}</p>
      </header>

      {lines.length === 0 ? (
        <section>{balancesDetail}</section>
      ) : (
        <div className="wide-2col lg:items-start">
          <section className="lg:col-start-1 lg:row-start-1">
            <h3 className="mb-2 text-sm font-medium text-muted">Who is ahead and who is behind</h3>
            <BalanceRiver rows={rows} />
          </section>

          <section className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <h3 className="mb-2 text-sm font-medium text-muted">Payments</h3>
            <ul className="card divide-y divide-rule overflow-hidden">
              {lines.map((line) => (
                <TransferCard key={`${line.from.id}-${line.to.id}`} line={line} tripName={trip.name} />
              ))}
            </ul>
            <SettleAllActions lines={lines} tripName={trip.name} />
            <p className="mt-4 text-sm text-muted">
              This is the fewest payments that clear every balance, so nobody pays twice. A UPI link appears when the person receiving has added a UPI
              id on the People tab.
            </p>
          </section>

          <section className="lg:col-start-1 lg:row-start-2">{balancesDetail}</section>
        </div>
      )}
    </div>
  );
}
