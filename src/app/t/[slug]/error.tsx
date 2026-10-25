"use client"; // Error boundaries must be Client Components

import { ErrorPanel } from "@/components/error-panel";

export default function TripError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorPanel error={error} retry={retry} />;
}
