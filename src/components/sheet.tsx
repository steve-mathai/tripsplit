"use client";

import { useEffect, type ReactNode } from "react";
import { CloseIcon } from "./icons";

/** Bottom sheet on phones, centred card on desktop. Closes on backdrop tap or Escape. */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[#0a1f1d]/55 backdrop-blur-[2px]"
      />
      <div className="sheet-enter relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-3xl sm:pb-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-ghost !h-11 !w-11 !px-0">
            <CloseIcon width={20} height={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
