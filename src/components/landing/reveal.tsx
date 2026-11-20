"use client";

import { useEffect } from "react";

/**
 * Turns on the entrance layer. Below-the-fold elements marked data-reveal start hidden only after this
 * runs (the `js` class), so without scripts everything is simply visible. Each fires once.
 */
export function RevealRoot() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.shown = "";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      root.classList.remove("js");
    };
  }, []);
  return null;
}

