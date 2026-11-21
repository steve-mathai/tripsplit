"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

const POLL_MS = 15_000;

/** Forms put `data-refresh-hold` on an element while they hold typed text or a pending save; polling waits until it is gone. */
const REFRESH_HOLD_SELECTOR = "[data-refresh-hold]";

/** True when a refresh could clobber what the person is doing: typing somewhere, or a form holding unsaved text. */
function userIsBusy(): boolean {
  if (document.querySelector(REFRESH_HOLD_SELECTOR)) return true;
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return false;
  if (active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement || active.isContentEditable) return true;
  // Checkboxes, radios and buttons take focus too but hold no typed text.
  return active instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit", "reset"].includes(active.type);
}

/**
 * Keeps the trip fresh for everyone: asks Next to re-render the server tree every 15 seconds while the tab is
 * visible. Nothing is fetched in a hidden tab, and coming back refreshes at once. It skips a beat while a
 * server action (save, vote, reaction) is in flight, while a refresh is still running, or while the person is
 * typing or has unsaved text in a form (`data-refresh-hold`). Renders nothing.
 */
export function LiveRefresh() {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const refreshingRef = useRef(false);
  // The interval callback reads this, so it is synced in an effect rather than during render.
  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    // Server actions are fetch POSTs tagged with a Next-Action header; counting them covers every vote, save and
    // reaction without each component having to announce itself.
    let actionsInFlight = 0;
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const [input, init] = args;
      const isAction = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).has("next-action");
      if (!isAction) return originalFetch.apply(window, args);
      actionsInFlight += 1;
      try {
        return await originalFetch.apply(window, args);
      } finally {
        actionsInFlight -= 1;
      }
    };

    // Data saver users keep the refresh on return but skip the background polling.
    const savesData = window.matchMedia("(prefers-reduced-data: reduce)").matches;
    let timer: ReturnType<typeof setInterval> | undefined;

    function refreshIfIdle() {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      if (actionsInFlight > 0 || refreshingRef.current || userIsBusy()) return;
      startTransition(() => router.refresh());
    }

    function start() {
      stop();
      if (!savesData) timer = setInterval(refreshIfIdle, POLL_MS);
    }

    function stop() {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshIfIdle();
        start();
      } else {
        stop();
      }
    }

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop();
      window.fetch = originalFetch;
    };
  }, [router]);

  return null;
}
