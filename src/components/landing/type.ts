// The page's five type steps. Tailwind finds these strings because it scans every source file.
export const DISPLAY = "text-[length:clamp(2.25rem,4vw,4rem)] font-semibold leading-[1.05] tracking-[-0.03em]";
export const TITLE = "text-[length:clamp(1.75rem,2.2vw,2.25rem)] font-semibold leading-[1.15] tracking-[-0.02em]";
export const LEAD = "text-[length:1.25rem] leading-[1.4]";
export const BODY = "text-base leading-[1.55]";
export const MICRO = "text-[length:0.8125rem] leading-[1.45]";

/** The page's one pair of outer margins: 16px on a phone, 24px from tablet up. Text never sits closer to the screen edge. */
export const MARGIN = "px-4 md:px-6";
