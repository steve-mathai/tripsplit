"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";
import { MarkIcon } from "@/components/icons";

// The trip layout's own data loading fails above t/[slug]/error.tsx, so this boundary catches it too.
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="card w-full max-w-md p-6 text-center">
        <MarkIcon width={32} height={32} className="mx-auto text-accent" />
        <h1 className="mt-4 text-title">Something went wrong</h1>
        <p className="mt-2 text-base text-muted">Your trip is safe. Try again in a moment.</p>
        <button type="button" onClick={() => retry()} className="btn-primary mt-6">
          Try again
        </button>
        <p className="mt-3">
          <Link href="/" className="text-sm font-medium text-muted underline underline-offset-4 hover:text-text">
            Back to Tripsplit
          </Link>
        </p>
      </div>
    </main>
  );
}
