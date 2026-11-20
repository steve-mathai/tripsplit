import { createHash } from "node:crypto";
import { isIPv6 } from "node:net";

/** Fixed windows per action. `window` is in seconds. */
export const RATE_LIMITS = {
  createTrip: { action: "create-trip", limit: 5, window: 60 * 60 },
  write: { action: "write", limit: 60, window: 60 },
  slugMiss: { action: "slug-miss", limit: 20, window: 10 * 60 },
} as const;

export const WRITE_LIMIT_MESSAGE = "Too many changes, try again in a minute.";
export const CREATE_TRIP_LIMIT_MESSAGE = "Too many new trips from this network, try again in an hour.";

export const UNKNOWN_CLIENT = "unknown";

/** IPv6 clients usually own a whole /64, so key on the first four groups or rotating addresses dodge the limit. */
function ipv6Prefix(address: string): string {
  const [head, tail = ""] = address.split("::");
  const headGroups = head === "" ? [] : head.split(":");
  const tailGroups = tail === "" ? [] : tail.split(":");
  const missing = address.includes("::") ? 8 - headGroups.length - tailGroups.length : 0;
  const groups = [...headGroups, ...Array<string>(Math.max(missing, 0)).fill("0"), ...tailGroups];
  return groups.slice(0, 4).map((g) => g.toLowerCase().replace(/^0+(?=.)/, "")).join(":");
}

/**
 * The client IP from proxy headers: the first x-forwarded-for hop, else x-real-ip. Vercel sets both
 * at its edge; anything that does not look like an IP falls back to a shared key.
 */
export function clientIp(get: (name: string) => string | null): string {
  const candidate = (get("x-forwarded-for")?.split(",")[0] ?? get("x-real-ip") ?? "").trim();
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(candidate);
  if (mapped) return mapped[1];
  if (isIPv6(candidate)) return ipv6Prefix(candidate);
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(candidate)) return candidate;
  return UNKNOWN_CLIENT;
}

/** SHA-256 of salt, ip, action and trip id, so raw IPs are never stored. NUL separators stop fields blending. */
export function rateLimitKey(ip: string, action: string, tripId = "", salt = ""): string {
  return createHash("sha256").update([salt, ip, action, tripId].join("\u0000")).digest("hex");
}
