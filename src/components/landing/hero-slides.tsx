"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export interface Slide {
  src: string;
  alt: string;
  width: number;
  height: number;
}

const HOLD_MS = 5500;
const FADE_MS = 1600;

/**
 * Slow crossfade through the places the demo trip goes. Each photograph is shown whole at its own aspect
 * ratio, centred on a flat field: nothing is cropped, scaled, tinted or covered. Opacity is the only thing
 * that changes. Pauses while the tab is hidden; reduced motion keeps the first picture.
 */
export function HeroSlides({ slides }: { slides: Slide[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: number | undefined;
    const start = () => {
      timer = window.setInterval(() => setActive((i) => (i + 1) % slides.length), HOLD_MS + FADE_MS);
    };
    const stop = () => window.clearInterval(timer);
    const onVisibility = () => {
      stop();
      if (!document.hidden) start();
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [slides.length]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-card bg-raised">
      {slides.map((slide, index) => (
        <div key={slide.src} className="absolute inset-0 flex items-center justify-center p-3">
          {/* unoptimized: the files are already web-sized JPEGs, and skipping the 3840px resize makes the first one paint at once. */}
          <Image
            src={slide.src}
            alt={slide.alt}
            width={slide.width}
            height={slide.height}
            sizes="(min-width: 1024px) 50vw, 100vw"
            unoptimized
            preload={index === 0}
            className={`h-auto max-h-full w-auto max-w-full transition-opacity ease-linear ${index === active ? "opacity-100" : "opacity-0"}`}
            style={{ transitionDuration: `${FADE_MS}ms` }}
          />
        </div>
      ))}
    </div>
  );
}
