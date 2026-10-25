function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// Pick black or white text by perceived luminance so any palette colour stays legible.
function readableOn(hex: string): string {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#17302d" : "#ffffff";
}

const SIZES = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

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
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ring-2 ring-card ${SIZES[size]} ${className}`}
      style={{ backgroundColor: color, color: readableOn(color) }}
    >
      {initials(name)}
    </span>
  );
}
