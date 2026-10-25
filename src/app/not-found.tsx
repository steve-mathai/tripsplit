import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl" aria-hidden="true">
        🧭
      </p>
      <h1 className="mt-4 font-display text-3xl font-semibold">Lost the trail</h1>
      <p className="mt-2 text-muted">We could not find that trip. Check the link your friend sent, or start a new one.</p>
      <Link href="/" className="btn-primary mt-6">
        Back to Tripsplit
      </Link>
    </main>
  );
}
