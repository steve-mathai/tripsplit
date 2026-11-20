"use client";

import { useState, type ReactNode } from "react";
import { BODY } from "./type";

export interface Output {
  id: string;
  name: string;
  caption: string;
  sheet: ReactNode;
}

/**
 * The live thing: pick an output and the stage swaps to that real sheet. All sheets are in the markup
 * (server-rendered, first one showing), so without scripts the first sheet is still there.
 */
export function OutputIndex({ outputs, heading }: { outputs: Output[]; heading: ReactNode }) {
  const [selected, setSelected] = useState(0);

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-x-3">
      <div className="min-w-0 lg:col-span-5" data-reveal="rise">
        {heading}
        <div role="group" aria-label="Choose what to look at" className="chip-row mt-6 -mr-3 flex gap-6 pr-3 snap-x snap-mandatory lg:mr-0 lg:mt-10 lg:block lg:overflow-visible lg:pr-0">
          {outputs.map((output, index) => (
            <button
              key={output.id}
              type="button"
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
              className={`block shrink-0 snap-start origin-left whitespace-nowrap py-1 text-left text-[length:1.375rem] font-semibold leading-[1.1] tracking-[-0.02em] transition-[color,transform] duration-200 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:transform-none lg:py-2 lg:text-[length:clamp(2.25rem,4vw,4rem)] lg:whitespace-normal ${
                index === selected ? "text-text" : "text-muted hover:text-text"
              }`}
            >
              {output.name}
            </button>
          ))}
        </div>
        <p aria-live="polite" className={`${BODY} mt-6 max-w-[36ch]`}>
          {outputs[selected].caption}
        </p>
      </div>

      <div
        data-reveal="rise"
        style={{ "--d": "140ms" } as React.CSSProperties}
        className="relative h-[70svh] overflow-hidden rounded-card bg-raised lg:col-span-6 lg:col-start-7 lg:h-[88svh]"
      >
        {outputs.map((output, index) => (
          <div
            key={output.id}
            inert={index !== selected}
            aria-hidden={index !== selected}
            className={`absolute left-4 top-4 transition-[opacity,visibility] duration-200 motion-reduce:transition-none lg:left-12 lg:top-[72px] ${
              index === selected ? "opacity-100" : "invisible pointer-events-none opacity-0"
            }`}
          >
            {output.sheet}
          </div>
        ))}
      </div>
    </div>
  );
}
