import type { CSSProperties } from "react";

/** Hue in whole degrees (0-359) of a stored "#rgb" or "#rrggbb" member colour. Greys and bad input give 0. */
export function hueOf(hex: string): number {
  const digits = hex.trim().replace(/^#/, "");
  const full = digits.length === 3 ? digits.replace(/./g, (c) => c + c) : digits;
  if (!/^[0-9a-f]{6}$/i.test(full)) return 0;

  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (delta === 0) return 0;

  let sector: number;
  if (max === r) sector = ((g - b) / delta) % 6;
  else if (max === g) sector = (b - r) / delta + 2;
  else sector = (r - g) / delta + 4;

  return Math.round((sector * 60 + 360) % 360) % 360;
}

export interface PersonTint {
  hue: number;
  /** Spread onto an element together with className "person-tint" (or person-bg / person-ink). */
  style: CSSProperties;
  /** Resolved colours for places CSS classes cannot reach (SVG attributes, canvas). Follow the theme yourself. */
  light: { bg: string; ink: string };
  dark: { bg: string; ink: string };
}

/**
 * Pale tint plus same-hue ink for a member colour. The theme switch happens in CSS: the element only
 * carries --p-h, and the person-tint / person-bg / person-ink utilities in globals.css do the rest.
 *
 *   const { style } = personTint(member.color);
 *   <span className="person-tint rounded-full px-2" style={style}>Meera</span>
 */
export function personTint(hex: string): PersonTint {
  const hue = hueOf(hex);
  return {
    hue,
    style: { "--p-h": hue } as CSSProperties,
    light: { bg: `hsl(${hue} 70% 92%)`, ink: `hsl(${hue} 60% 26%)` },
    dark: { bg: `hsl(${hue} 30% 20%)`, ink: `hsl(${hue} 70% 80%)` },
  };
}
