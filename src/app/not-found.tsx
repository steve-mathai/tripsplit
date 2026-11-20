import Link from "next/link";
import { MarkIcon } from "@/components/icons";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="card w-full max-w-md p-6 text-center">
        <MarkIcon width={32} height={32} className="mx-auto text-accent" />
        <h1 className="mt-4 text-title">Trip not found</h1>
        <p className="mt-2 text-base text-muted">Check the link your friend sent, or start a new trip.</p>
        <Link href="/" className="btn-primary mt-6">
          Back to Tripsplit
        </Link>
      </div>
    </main>
  );
}
