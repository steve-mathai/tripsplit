"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BODY, TITLE } from "./type";

export interface Step {
  title: string;
  body: string;
  fragment: ReactNode;
}

/**
 * Three statements on the left, one sticky stage on the right. The statement crossing the middle of the
 * viewport is the active one and the stage shows the matching state. Without scripts: state 1 shows and
 * all three statements are readable.
 */
export function HowPinned({ heading, steps }: { heading: string; steps: Step[] }) {
  const [active, setActive] = useState(0);
  const blocks = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    // A thin band across the viewport's middle: whichever block crosses it is the active one.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(blocks.current.indexOf(entry.target as HTMLLIElement));
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    blocks.current.forEach((block) => block && observer.observe(block));
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <h2 id="how-title" className={TITLE} data-reveal="rise">
        {heading}
      </h2>
      <div className="mt-8 flex flex-col lg:grid lg:grid-cols-12 lg:gap-x-3">
        <div
          className="sticky top-3 z-10 h-[46svh] overflow-hidden rounded-card bg-raised lg:top-[14vh] lg:order-2 lg:col-span-6 lg:col-start-7 lg:h-[520px] lg:self-start"
          data-reveal="rise"
          style={{ "--d": "140ms" } as React.CSSProperties}
        >
          {steps.map((step, index) => (
            <div
              key={step.title}
              inert={index !== active}
              aria-hidden={index !== active}
              data-state={index === active ? "active" : "idle"}
              className="absolute left-4 top-4 transition-[opacity,visibility] duration-200 motion-reduce:transition-none data-[state=idle]:invisible data-[state=idle]:opacity-0 lg:left-8 lg:top-8"
            >
              {step.fragment}
            </div>
          ))}
        </div>

        <ol className="lg:order-1 lg:col-span-5">
          {steps.map((step, index) => (
            <li
              key={step.title}
              ref={(el) => {
                blocks.current[index] = el;
              }}
              className="flex min-h-[60svh] flex-col justify-center lg:min-h-[80vh]"
            >
              <h3
                className={`text-[length:1.375rem] font-semibold leading-[1.2] tracking-[-0.02em] transition-colors duration-300 motion-reduce:transition-none lg:text-[length:clamp(1.75rem,2.2vw,2.25rem)] ${
                  index === active ? "text-text" : "text-muted"
                }`}
              >
                {step.title}
              </h3>
              <p className={`${BODY} mt-3 max-w-[36ch] ${index === active ? "text-text" : "text-muted"}`}>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
