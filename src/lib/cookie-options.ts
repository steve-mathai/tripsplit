const IDENTITY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Options for the "who am I on this trip" cookie. Scoped to the one trip so a browser that has
 * opened many trips does not send every cookie on every request; Secure everywhere except local http.
 */
export function identityCookieOptions(slug: string, isProduction: boolean) {
  return {
    path: `/t/${slug}`,
    maxAge: IDENTITY_COOKIE_MAX_AGE,
    sameSite: "lax" as const,
    httpOnly: true,
    secure: isProduction,
  };
}
