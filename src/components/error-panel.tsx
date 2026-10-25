"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Friendly fallback for the error.tsx boundaries: the real error stays in the console and server logs. */
export function ErrorPanel({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-[640px] flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl" aria-hidden="true">
        🌧️
      </p>
      <h1 className="mt-4 font-display text-3xl font-semibold">Hit a pothole</h1>
      <p className="mt-2 text-muted">Something went wrong on our side. Your trip is safe - give it another go.</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={() => retry()} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-ghost">
          Back to Tripsplit
        </Link>
      </div>
    </div>
  );
}
