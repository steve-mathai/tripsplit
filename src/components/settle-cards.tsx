"use client";

import { formatINR } from "@/lib/money";
import { Avatar } from "./avatar";
import { CopyButton } from "./copy-button";
import { UpiIcon, WhatsAppIcon } from "./icons";

export interface SettleParty {
  id: string;
  name: string;
  color: string;
  upiId: string | null;
}

export interface SettleLine {
  from: SettleParty;
  to: SettleParty;
  amountPaise: number;
}

export function transferLine(line: SettleLine): string {
  return `${line.from.name} pays ${line.to.name} ${formatINR(line.amountPaise)}`;
}

/** UPI deep link; amount is rupees with up to two decimals as the UPI spec requires. */
export function upiLink(line: SettleLine, tripName: string): string | null {
  if (!line.to.upiId) return null;
  const rupees = (line.amountPaise / 100).toFixed(2);
  const query = new URLSearchParams({
    pa: line.to.upiId,
    pn: line.to.name,
    am: rupees,
    cu: "INR",
    tn: tripName,
  });
  // URLSearchParams encodes spaces as '+' and '@' as %40; UPI apps expect %20 and a literal '@' in the payee address.
  return `upi://pay?${query.toString().replace(/\+/g, "%20").replace(/%40/g, "@")}`;
}

/** One payment row. Rendered inside the payments card (a `ul` with row rules), so it draws no card of its own. */
export function TransferCard({ line, tripName }: { line: SettleLine; tripName: string }) {
  const upi = upiLink(line, tripName);
  return (
    <li className="flex items-center gap-3 py-3 pl-4 pr-2">
      <div className="flex shrink-0 items-center -space-x-1" aria-hidden="true">
        <Avatar name={line.from.name} color={line.from.color} size="sm" className="ring-2 ring-surface" />
        <Avatar name={line.to.name} color={line.to.color} size="sm" className="ring-2 ring-surface" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="min-w-0 text-base [overflow-wrap:anywhere]">
          <span className="font-semibold">{line.from.name}</span> pays <span className="font-semibold">{line.to.name}</span>
        </p>
        {/* Phones: the amount sits under the names, so a long pair of names keeps the full column instead of ~100px. */}
        <p className="num mt-0.5 text-base font-semibold sm:hidden">{formatINR(line.amountPaise)}</p>
        {upi && (
          <a
            href={upi}
            className="-my-2 inline-flex min-h-11 max-w-full items-center gap-1.5 text-sm font-medium text-accent-ink underline-offset-2 hover:underline"
          >
            <UpiIcon width={14} height={14} className="shrink-0" />
            <span className="min-w-0 [overflow-wrap:anywhere]">Pay {formatINR(line.amountPaise)} via UPI</span>
          </a>
        )}
      </div>
      <p className="num hidden shrink-0 text-base font-semibold sm:block">{formatINR(line.amountPaise)}</p>
      <CopyButton text={transferLine(line)} label={`Copy ${transferLine(line)}`} iconOnly className="btn-ghost !h-11 !w-11 shrink-0 !px-0" />
    </li>
  );
}

export function SettleAllActions({ lines, tripName }: { lines: SettleLine[]; tripName: string }) {
  const text = [`${tripName} - settle up`, ...lines.map(transferLine)].join("\n");
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <CopyButton text={text} label="Copy all" className="btn-primary" />
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
        <WhatsAppIcon width={20} height={20} className="text-whatsapp" />
        Send on WhatsApp
      </a>
    </div>
  );
}
