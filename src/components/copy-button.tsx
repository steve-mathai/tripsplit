"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "./icons";

/** Copy text to the clipboard. Falls back to a hidden textarea for non-secure contexts (plain http on a LAN). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  }
}

export function CopyButton({
  text,
  label = "Copy",
  className = "btn-ghost",
  iconOnly = false,
}: {
  text: string;
  label?: string;
  className?: string;
  /** Square icon button: `label` becomes the accessible name and the copied state turns green. */
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={copied ? "Copied" : label}
        title={copied ? "Copied" : label}
        className={`${className} ${copied ? "!border-good !bg-good-soft !text-good" : ""}`}
      >
        {copied ? <CheckIcon width={18} height={18} /> : <CopyIcon width={18} height={18} />}
      </button>
    );
  }

  return (
    <button type="button" onClick={handleClick} className={className} aria-live="polite">
      {copied ? <CheckIcon width={18} height={18} /> : <CopyIcon width={18} height={18} />}
      {copied ? "Copied" : label}
    </button>
  );
}
