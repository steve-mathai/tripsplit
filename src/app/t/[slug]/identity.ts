import "server-only";
import { cookies } from "next/headers";
import { identityCookieOptions } from "@/lib/cookie-options";

const identityCookieName = (tripId: string) => `ts_${tripId}`;

/** The member this browser said it is, or null if unset or no longer on the trip. */
export async function getCurrentMemberId(trip: { id: string; members: { id: string }[] }): Promise<string | null> {
  const value = (await cookies()).get(identityCookieName(trip.id))?.value;
  return value && trip.members.some((m) => m.id === value) ? value : null;
}

export async function setIdentityCookie(tripId: string, slug: string, memberId: string): Promise<void> {
  (await cookies()).set(identityCookieName(tripId), memberId, identityCookieOptions(slug, process.env.NODE_ENV === "production"));
}
