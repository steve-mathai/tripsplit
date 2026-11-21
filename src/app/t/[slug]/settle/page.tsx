import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { MONEY_TONE_CLASS, signedINR } from "@/components/money-sign";
import { CardSkeleton } from "@/components/skeletons";
import {
  PaymentMadeRow,
  SettleAllActions,
  TransferCard,
  type PaymentMade,
  type SettleLine,
  type SettleParty,
} from "@/components/settle-cards";
import { getExpenses, getSettlements, getTripBySlug } from "@/db/queries";
import { computeBalances } from "@/lib/balances";
import { formatINR } from "@/lib/money";
import { planSettlement } from "@/lib/settle-plan";
import type { Balance } from "@/lib/types";
import { toMathsExpenses } from "../maths-input";

export const metadata = { title: "Settle up" };

export default function SettlePage({ params, searchParams }: PageProps<"/t/[slug]/settle">) {
  return (
    <Suspense fallback={<CardSkeleton count={4} height="h-16" />}>
      <SettleContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const PAID_AT_FORMAT = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "Fri 30 Oct, 6:00 pm" in India time, built from parts so the punctuation does not depend on the ICU version. */
function formatPaidAt(date: Date): string {
  const part = (type: Intl.DateTimeFormatPartTypes) => PAID_AT_FORMAT.formatToParts(date).find((p) => p.type === type)?.value ?? "";
  return `${part("weekday")} ${part("day")} ${part("month")}, ${part("hour")}:${part("minute")} ${part("dayPeriod").toLowerCase()}`;
}

/** Exact versus whole-rupee view; the choice lives in the URL so a shared WhatsApp list matches what the sender saw. */
function RoundToggle({ slug, round }: { slug: string; round: boolean }) {
  return (
    <div className="flex gap-2" role="group" aria-label="Amounts">
      <Link href={`/t/${slug}/settle`} className="chip" data-active={round ? undefined : "true"} aria-current={round ? undefined : "true"} replace>
        Exact amounts
      </Link>
      <Link href={`/t/${slug}/settle?round=1`} className="chip" data-active={round ? "true" : undefined} aria-current={round ? "true" : undefined} replace>
        Whole rupees
      </Link>
    </div>
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

async function SettleContent({
  params,
  searchParams,
}: {
  params: PageProps<"/t/[slug]/settle">["params"];
  searchParams: PageProps<"/t/[slug]/settle">["searchParams"];
}) {
  await connection();
  const { slug } = await params;
  const round = (await searchParams).round === "1";
  const trip = await getTripBySlug(slug);
  if (!trip) notFound();
  const [expenses, payments] = await Promise.all([getExpenses(trip.id), getSettlements(trip.id)]);

  const trueBalances = computeBalances(
    trip.members,
    toMathsExpenses(expenses),
    payments.map((p) => ({ from: p.fromMember, to: p.toMember, amountPaise: p.amountPaise })),
  );
  // Rounding applies to what is left after settlements; the rows below show the nets the transfers settle.
  const { nets, transfers, driftPaise } = planSettlement(trueBalances, round);
  const netById = new Map(nets.map((n) => [n.memberId, n.net]));
  const balances = trueBalances.map((b) => ({ ...b, net: netById.get(b.memberId) ?? b.net }));
  const memberById = new Map(trip.members.map((m) => [m.id, m]));
  const party = (id: string): SettleParty => {
    const m = memberById.get(id)!;
    return { id: m.id, name: m.name, color: m.color, upiId: m.upiId };
  };
  const lines: SettleLine[] = transfers.map((t) => ({ from: party(t.from), to: party(t.to), amountPaise: t.amountPaise }));
  const rows = balances
    .map((balance) => ({ balance, person: party(balance.memberId) }))
    .sort((a, b) => b.balance.net - a.balance.net || a.person.name.localeCompare(b.person.name));

  const paymentsMade: PaymentMade[] = payments.map((p) => ({
    id: p.id,
    from: party(p.fromMember),
    to: party(p.toMember),
    amountPaise: p.amountPaise,
    paidAt: formatPaidAt(p.createdAt),
  }));

  const heading =
    lines.length === 0 ? "Everyone is settled up" : `${lines.length} ${lines.length === 1 ? "payment settles" : "payments settle"} everyone`;

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

  const paymentsMadeList = paymentsMade.length > 0 && (
    <section>
      <h3 className="mb-2 text-sm font-medium text-muted">Payments made</h3>
      <ul className="card divide-y divide-rule overflow-hidden">
        {paymentsMade.map((payment) => (
          <PaymentMadeRow key={payment.id} slug={trip.slug} payment={payment} />
        ))}
      </ul>
    </section>
  );

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

      <RoundToggle slug={trip.slug} round={round} />
      {round && (
        <p className="text-sm text-muted" aria-live="polite">
          {driftPaise > 0
            ? `${formatINR(driftPaise)} of rounding is spread across the group.`
            : "Every balance is already a whole number of rupees, so nothing was rounded."}
        </p>
      )}

      {lines.length === 0 ? (
        <div className="space-y-4">
          {paymentsMadeList}
          <section>{balancesDetail}</section>
        </div>
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
                <TransferCard key={`${line.from.id}-${line.to.id}`} slug={trip.slug} line={line} tripName={trip.name} round={round} />
              ))}
            </ul>
            <SettleAllActions lines={lines} tripName={trip.name} />
            <p className="mt-4 text-sm text-muted">
              This is the fewest payments that clear every balance, so nobody pays twice. A UPI link appears when the person receiving has added a UPI
              id on the People tab.
            </p>
          </section>

          <section className="space-y-4 lg:col-start-1 lg:row-start-2">
            {balancesDetail}
            {paymentsMadeList}
          </section>
        </div>
      )}
    </div>
  );
}
