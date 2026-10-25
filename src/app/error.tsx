"use client"; // Error boundaries must be Client Components

import { ErrorPanel } from "@/components/error-panel";

// The trip layout's own data loading fails above t/[slug]/error.tsx, so this boundary catches it too.
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorPanel error={error} retry={retry} />;
}
