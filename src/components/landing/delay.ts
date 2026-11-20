import type { CSSProperties } from "react";

/** Stagger helper for data-reveal: heading 0, text 1, fragment 2 ... 70ms apart. Safe in server components. */
export const delay = (step: number): CSSProperties => ({ "--d": `${step * 70}ms` }) as CSSProperties;
