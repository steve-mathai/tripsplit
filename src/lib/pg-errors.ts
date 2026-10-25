import { UserError } from "./errors";

const SQLSTATE = /^[0-9A-Z]{5}$/;

/**
 * The Postgres SQLSTATE behind a failed query, if any. Drizzle's pglite driver wraps the
 * driver error in a DrizzleQueryError (code on `.cause`), while neon-http's batch rethrows
 * the driver error as-is, so walk the cause chain to handle both.
 */
export function postgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth++) {
    const { code, cause } = current as { code?: unknown; cause?: unknown };
    if (typeof code === "string" && SQLSTATE.test(code)) return code;
    current = cause;
  }
  return undefined;
}

/**
 * Friendly version of a known Postgres failure, or null when the error is not one we
 * expect from user input (so the caller rethrows it as a genuine bug).
 * `uniqueMessage` says what a 23505 means for the statement that was running.
 */
export function toUserError(error: unknown, uniqueMessage = "That already exists"): UserError | null {
  switch (postgresErrorCode(error)) {
    case "23505":
      return new UserError(uniqueMessage);
    case "23503":
      return new UserError("That person was removed - refresh and try again");
    case "22007":
    case "22008":
      return new UserError("That date does not look right");
    case "22003":
      return new UserError("That number is too large");
    default:
      return null;
  }
}
