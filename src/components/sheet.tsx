"use client";

import { useEffect, useRef, type ReactNode } from "react";
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
  const panel = useRef<HTMLDivElement>(null);

  // Move focus into the dialog (unless a field inside already took it) and give it back on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (panel.current && !panel.current.contains(document.activeElement)) panel.current.focus();
    return () => opener?.focus();
  }, []);

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
        className="absolute inset-0 cursor-default bg-black/50"
      />
      {/* The only surface that floats, so it is the one with a shadow. overscroll-contain stops the page scrolling behind it. */}
      <div ref={panel} tabIndex={-1} className="sheet-enter relative max-h-[88dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-card outline-none border border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgb(0_0_0/0.18)] sm:rounded-card sm:pb-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="min-w-0 text-section">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-ghost !w-11 shrink-0 !px-0">
            <CloseIcon width={20} height={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
