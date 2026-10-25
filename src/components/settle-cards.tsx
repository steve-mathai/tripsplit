"use client";

import { formatINR } from "@/lib/money";
import { Avatar } from "./avatar";
import { CopyButton } from "./copy-button";
import { ArrowRightIcon, UpiIcon, WhatsAppIcon } from "./icons";

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

export function TransferCard({ line, tripName }: { line: SettleLine; tripName: string }) {
  const upi = upiLink(line, tripName);
  return (
    <li className="card flex items-center gap-2.5 py-2 pl-3 pr-2">
      <div className="flex shrink-0 items-center -space-x-1">
        <Avatar name={line.from.name} color={line.from.color} size="sm" />
        <Avatar name={line.to.name} color={line.to.color} size="sm" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug">
          <span className="font-bold">{line.from.name}</span> <ArrowRightIcon width={14} height={14} className="inline text-muted" />{" "}
          <span className="font-bold">{line.to.name}</span>
        </p>
        {upi && (
          <a href={upi} className="btn-soft mt-1 !min-h-9 !gap-1.5 !px-3 text-xs">
            <UpiIcon width={14} height={14} />
            Pay via UPI
          </a>
        )}
      </div>
      <p className="shrink-0 font-display text-base font-semibold tabular-nums text-accent-deep">{formatINR(line.amountPaise)}</p>
      <CopyButton text={transferLine(line)} label={`Copy ${transferLine(line)}`} iconOnly className="btn-ghost !h-11 !w-11 shrink-0 !px-0" />
    </li>
  );
}

export function SettleAllActions({ lines, tripName }: { lines: SettleLine[]; tripName: string }) {
  const text = [`${tripName} - settle up`, ...lines.map(transferLine)].join("\n");
  return (
    <div className="mt-4 grid grid-cols-2 gap-2.5">
      <CopyButton text={text} label="Copy all" className="btn-soft" />
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="btn bg-[#25d366] text-[#052e16]">
        <WhatsAppIcon width={20} height={20} />
        Send on WhatsApp
      </a>
    </div>
  );
}
