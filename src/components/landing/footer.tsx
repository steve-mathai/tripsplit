import Image from "next/image";
import Link from "next/link";
import { MarkIcon } from "../icons";
import credits from "../../../public/photos/credits.json";
import { delay } from "./delay";
import { Stripe } from "./stripe";
import { BODY, TITLE } from "./type";

const MENU = [
  { label: "Plan", href: "#menu-plan" },
  { label: "Split", href: "#menu-split" },
  { label: "Settle", href: "#menu-settle" },
  { label: "Demo trip", href: "/t/kochi-2026" },
  { label: "Create a trip", href: "#start" },
];

const SOFT = "text-[color-mix(in_srgb,var(--primary-fg)_80%,var(--primary))]";

export function Footer() {
  return (
    <footer aria-label="Site footer">
      <Stripe className="h-2" />
      <div className="grid lg:min-h-svh lg:grid-cols-2">
        {/* The portrait photograph is framed whole at its own 2:3 ratio on a flat field, never cropped. */}
        <div className="flex items-center justify-center bg-raised p-4 md:p-6" data-reveal="rise">
          <Image
            src="/photos/kochi-fishing-net.jpg"
            alt="Chinese fishing net lifted over the water at Fort Kochi"
            width={1920}
            height={2880}
            sizes="(min-width: 1024px) 50vw, 100vw"
            unoptimized
            loading="lazy"
            className="h-auto max-h-[calc(100svh-3rem)] w-auto max-w-full"
          />
        </div>

        <div className="flex flex-col bg-primary px-4 py-10 text-primary-fg md:px-6 lg:px-12 lg:py-16">
          <p className="inline-flex items-center gap-2 text-base font-semibold">
            <MarkIcon />
            Tripsplit
          </p>
          <nav aria-label="Footer" className="mt-10 lg:mt-16">
            <ul className="landing-menu space-y-5 lg:space-y-7">
              {MENU.map((entry, index) => (
                <li key={entry.label} data-reveal="rise" style={delay(index)}>
                  {entry.href.startsWith("/") ? (
                    <Link href={entry.href} className={`${TITLE} lg:!text-[length:2.6vw]`}>
                      {entry.label}
                    </Link>
                  ) : (
                    <a href={entry.href} className={`${TITLE} lg:!text-[length:2.6vw]`}>
                      {entry.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className={`${BODY} mt-auto pt-16 ${SOFT}`}>
            <p>Photographs, all from Wikimedia Commons:</p>
            <ul className="mt-2 space-y-2">
              {credits.map((credit) => (
                <li key={credit.file}>
                  {credit.title} by {credit.creator},{" "}
                  <a href={credit.licenseUrl} className="underline underline-offset-2">
                    {credit.license}
                  </a>
                  ,{" "}
                  <a href={credit.page} className="underline underline-offset-2">
                    source
                  </a>
                  .
                </li>
              ))}
            </ul>
            <p className="mt-4">The people in the demo trip are made up. The photographs show Kerala and are not theirs.</p>
            <p className="mt-4">© 2026 Steve Mathai Mathew. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
