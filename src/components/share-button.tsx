"use client";

import { useState, useSyncExternalStore } from "react";
import { CopyButton } from "./copy-button";
import { ShareIcon, WhatsAppIcon } from "./icons";
import { Sheet } from "./sheet";

const subscribeNever = () => () => {};
const canNativeShare = () => typeof navigator !== "undefined" && typeof navigator.share === "function";

export function ShareButton({ slug, tripName }: { slug: string; tripName: string }) {
  const [open, setOpen] = useState(false);
  // Server snapshot is false so markup matches before hydration.
  const nativeShare = useSyncExternalStore(subscribeNever, canNativeShare, () => false);

  // Only read when the sheet is open, which can only happen in the browser.
  const url = open ? `${window.location.origin}/t/${slug}` : "";
  const message = `Join our trip ${tripName} on Tripsplit: ${url}`;

  async function shareNatively() {
    try {
      await navigator.share({ title: tripName, text: `Join our trip ${tripName} on Tripsplit`, url });
      setOpen(false);
    } catch {
      // The user dismissed the native sheet; keep ours open so they can copy instead.
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn bg-white/15 text-white ring-1 ring-white/30 backdrop-blur">
        <ShareIcon width={18} height={18} />
        Share
      </button>
      {open && (
        <Sheet title="Invite the gang" onClose={() => setOpen(false)}>
          <p className="mb-3 text-sm text-muted">
            Anyone with this link can view and edit the trip. Drop it in the WhatsApp group.
          </p>
          <div className="mb-4 break-all rounded-xl border border-line bg-card-soft px-3.5 py-3 text-sm font-medium">{url}</div>
          <div className="grid gap-2.5">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-[#25d366] text-[#052e16]"
            >
              <WhatsAppIcon width={20} height={20} />
              Share on WhatsApp
            </a>
            <CopyButton text={url} label="Copy link" className="btn-soft" />
            {nativeShare && (
              <button type="button" onClick={shareNatively} className="btn-ghost">
                <ShareIcon width={18} height={18} />
                More apps
              </button>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}
