export const DEMO_READ_ONLY_MESSAGE = "The demo trip is read-only. Create your own trip to try it.";

/**
 * True when a write to this trip must be refused: it is the demo trip and the deployment is
 * production (`VERCEL_ENV`) or someone set `DEMO_READ_ONLY=1`. Local dev and tests stay editable.
 */
export function isDemoWriteBlocked(
  tripSlug: string,
  demoSlug: string,
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  return tripSlug === demoSlug && (env.VERCEL_ENV === "production" || env.DEMO_READ_ONLY === "1");
}
