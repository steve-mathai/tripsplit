import Link from "next/link";
import { MarkIcon } from "../icons";
import { HeroSlides, type Slide } from "./hero-slides";
import { Stripe } from "./stripe";
import { BODY, DISPLAY, LEAD, MARGIN } from "./type";

// Pixel sizes are those of the files in public/photos (see credits.json).
const SLIDES: Slide[] = [
  { src: "/photos/backwaters-houseboats.jpg", alt: "Houseboats on calm backwater near Alleppey, Kerala", width: 1920, height: 1280 },
  { src: "/photos/munnar-tea.jpg", alt: "Tea-covered hills near Munnar, Kerala", width: 1920, height: 872 },
  { src: "/photos/kochi-fishing-net.jpg", alt: "A Chinese fishing net under a grey sky at Fort Kochi", width: 1920, height: 2880 },
];

const LINK = `inline-flex min-h-11 items-center ${BODY} underline decoration-from-font underline-offset-4 transition-transform active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:transform-none`;

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className={`${MARGIN} pt-4 md:pt-6 lg:grid lg:grid-cols-2 lg:gap-3`}>
      {/* On a phone the photograph leads; on desktop it is the sticky right half. */}
      <div className="h-[48svh] lg:sticky lg:top-6 lg:order-2 lg:h-[calc(100svh-3rem)]">
        <HeroSlides slides={SLIDES} />
      </div>

      <div className="relative -mt-6 flex flex-col overflow-hidden rounded-card bg-surface lg:mt-0 lg:min-h-[calc(100svh-3rem)]">
        <Stripe animate className="h-10 shrink-0 lg:h-14" />
        <div className="flex flex-1 flex-col p-4 pb-6 lg:p-12 lg:pb-8">
          {/* A plain top bar: the wordmark alone, well clear of the headline block below. */}
          <p className="landing-in inline-flex items-center gap-2 text-base font-semibold">
            <MarkIcon className="text-accent" />
            Tripsplit
          </p>
          <h1 className={`${DISPLAY} landing-in mt-16 lg:mt-[16vh]`} style={{ "--d": "80ms" } as React.CSSProperties}>
            <span className="block">Plan the trip.</span>
            <span className="block">Split the bill.</span>
          </h1>
          <p className={`${LEAD} landing-in mt-5 max-w-[36ch]`} style={{ "--d": "160ms" } as React.CSSProperties}>
            One link for your WhatsApp group: the day plan, the votes, every bill and who pays whom. No sign-up.
          </p>
          <div className="landing-in mt-8" style={{ "--d": "240ms" } as React.CSSProperties}>
            <a href="#start" className="btn-primary !min-h-12 text-base">
              Create a trip
            </a>
          </div>
          <nav aria-label="More on this page" className="mt-auto flex flex-wrap gap-x-6 pt-8">
            <Link href="/t/kochi-2026" className={LINK}>
              Open the demo trip
            </Link>
            <a href="#how" className={LINK}>
              How it works
            </a>
            <a href="#menu" className={LINK}>
              What it does
            </a>
          </nav>
        </div>
      </div>
    </section>
  );
}
