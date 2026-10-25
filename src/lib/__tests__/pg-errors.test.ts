import { describe, expect, it } from "vitest";
import { UserError } from "../errors";
import { postgresErrorCode, toUserError } from "../pg-errors";

/** Mimics DrizzleQueryError: the driver error sits on `.cause`. */
const wrapped = (code: string) => Object.assign(new Error("Failed query"), { cause: Object.assign(new Error("db"), { code }) });
/** Mimics the raw driver error neon-http batch throws. */
const raw = (code: string) => Object.assign(new Error("db"), { code });

describe("postgresErrorCode", () => {
  it("reads the code from both a wrapped and a raw driver error", () => {
    expect(postgresErrorCode(wrapped("23505"))).toBe("23505");
    expect(postgresErrorCode(raw("23503"))).toBe("23503");
  });

  it("ignores things that are not SQLSTATE codes", () => {
    expect(postgresErrorCode(new Error("boom"))).toBeUndefined();
    expect(postgresErrorCode(Object.assign(new Error("x"), { code: "ECONNRESET" }))).toBeUndefined();
    expect(postgresErrorCode(null)).toBeUndefined();
    expect(postgresErrorCode("23505")).toBeUndefined();
  });

  it("survives a cause cycle", () => {
    const loop = new Error("loop") as Error & { cause?: unknown };
    loop.cause = loop;
    expect(postgresErrorCode(loop)).toBeUndefined();
  });
});

describe("toUserError", () => {
  it("maps unique violations to the caller's message in either error shape", () => {
    for (const error of [wrapped("23505"), raw("23505")]) {
      const friendly = toUserError(error, "Someone called Riya is already on this trip");
      expect(friendly).toBeInstanceOf(UserError);
      expect(friendly?.message).toBe("Someone called Riya is already on this trip");
    }
  });

  it("maps foreign-key and bad-date failures", () => {
    expect(toUserError(wrapped("23503"))?.message).toMatch(/person was removed/);
    expect(toUserError(raw("22008"))?.message).toMatch(/date/);
    expect(toUserError(wrapped("22007"))?.message).toMatch(/date/);
  });

  it("returns null for errors that are real bugs", () => {
    expect(toUserError(new TypeError("x"))).toBeNull();
    expect(toUserError(wrapped("42P01"))).toBeNull();
  });
});
