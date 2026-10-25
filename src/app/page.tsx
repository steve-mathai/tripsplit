import Link from "next/link";
import { ArrowRightIcon, MapIcon, ScaleIcon, WhatsAppIcon } from "@/components/icons";
import { CreateTripForm } from "@/components/create-trip-form";

const FEATURES = [
  { Icon: MapIcon, title: "Plan together", body: "Day-by-day plans. Put two options up and let the group vote, then lock one in." },
  { Icon: ScaleIcon, title: "Split fairly", body: "Equal, exact or by shares. Only four of eleven went karting? Only they pay." },
  { Icon: WhatsAppIcon, title: "Settle in a few taps", body: "The fewest possible payments, ready to paste into the group or pay by UPI." },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header className="relative overflow-hidden bg-hero px-5 pb-16 pt-[calc(1.25rem+env(safe-area-inset-top))] text-white">
        <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full text-paper" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 22c40 0 40-14 80-14s40 14 80 14 40-14 80-14 40 14 80 14 40-14 80-14v32H0z" fill="currentColor" />
        </svg>
        <div className="pointer-events-none absolute -right-8 -top-14 h-36 w-36 rounded-full bg-accent" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-10 top-40 h-32 w-32 rounded-full bg-primary/40" aria-hidden="true" />
        <div className="relative mx-auto max-w-[640px]">
          <p className="mb-10 font-display text-xl font-semibold tracking-tight">Tripsplit</p>
          <h1 className="font-display text-[2.6rem] font-semibold leading-[1.05] sm:text-5xl">
            Plan the trip.
            <br />
            Split the bill.
            <br />
            <span className="text-accent">Stay friends.</span>
          </h1>
          <p className="mt-4 max-w-md text-base text-white/80">
            One link for the whole WhatsApp group: the itinerary, the votes, every expense and who owes whom. No sign-ups.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/t/kochi-2026" className="btn-accent !min-h-12 text-base">
              Open the demo trip (Kochi, 11 friends)
              <ArrowRightIcon width={18} height={18} />
            </Link>
            <a href="#start" className="btn !min-h-12 bg-white/15 text-base text-white ring-1 ring-white/30">
              Start a trip
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[640px] space-y-8 px-4">
        <ul className="grid gap-3 sm:grid-cols-3">
          {FEATURES.map(({ Icon, title, body }) => (
            <li key={title} className="card p-4">
              <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-deep">
                <Icon width={22} height={22} />
              </span>
              <h2 className="font-display text-lg font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </li>
          ))}
        </ul>

        <section aria-labelledby="start-heading">
          <h2 id="start-heading" className="mb-3 font-display text-2xl font-semibold">
            Start a trip
          </h2>
          <CreateTripForm />
        </section>

        <p className="text-center text-xs text-muted">
          Anyone with a trip link can view and edit it, so share it only with your group.
        </p>
      </main>
    </div>
  );
}
