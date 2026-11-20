"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { MarkIcon } from "@/components/icons";

export default function TripError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card mx-auto mt-4 w-full max-w-md p-6 text-center">
      <MarkIcon width={32} height={32} className="mx-auto text-accent" />
      <h2 className="mt-4 text-title">Something went wrong</h2>
      <p className="mt-2 text-base text-muted">Your trip is safe. Try again in a moment.</p>
      <button type="button" onClick={() => retry()} className="btn-primary mt-6">
        Try again
      </button>
    </div>
  );
}
