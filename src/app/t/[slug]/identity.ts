import "server-only";
import { cookies } from "next/headers";

const IDENTITY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const identityCookieName = (tripId: string) => `ts_${tripId}`;

/** The member this browser said it is, or null if unset or no longer on the trip. */
export async function getCurrentMemberId(trip: { id: string; members: { id: string }[] }): Promise<string | null> {
  const value = (await cookies()).get(identityCookieName(trip.id))?.value;
  return value && trip.members.some((m) => m.id === value) ? value : null;
}

export async function setIdentityCookie(tripId: string, memberId: string): Promise<void> {
  (await cookies()).set(identityCookieName(tripId), memberId, {
    path: "/",
    maxAge: IDENTITY_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: true,
  });
}
