import { personTint } from "./person-tint";

// Grapheme clusters, not UTF-16 units: "प्रिया" must not become half a conjunct and "🙂 Sam" must not become half an emoji.
const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

function graphemes(text: string): string[] {
  return segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return graphemes(words[0]).slice(0, 2).join("").toUpperCase();
  return (graphemes(words[0])[0] + graphemes(words[words.length - 1])[0]).toUpperCase();
}

const SIZES = {
  sm: "h-7 w-7 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

/** Pale tint of the person's hue with the dark of that hue as ink. Decorative: the name is always printed beside it. */
export function Avatar({
  name,
  color,
  size = "md",
  className = "",
}: {
  name: string;
  color: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`person-tint inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold leading-none ${SIZES[size]} ${className}`}
      style={personTint(color).style}
    >
      {initials(name)}
    </span>
  );
}
