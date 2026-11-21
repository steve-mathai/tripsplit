import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { rateLimitSalt } from "../rate-limit";

// Kept out of rate-limit.test.ts: that file's PGlite beforeAll would skip these tests if it fails.
// Fake values only: these are never real secrets.
const FAKE_DATABASE_URL = "postgresql://fake-user:fake-password@fake-host.example.invalid/fake-db"; // leakguard:allow (fake test DB URL)
const FAKE_SALT = "fake-explicit-salt";

describe("rateLimitSalt", () => {
  it("uses an explicit RATE_LIMIT_SALT over the DATABASE_URL fallback", () => {
    expect(rateLimitSalt({ RATE_LIMIT_SALT: FAKE_SALT, DATABASE_URL: FAKE_DATABASE_URL })).toBe(FAKE_SALT);
  });

  it("derives the salt from DATABASE_URL (sha256 hex) when no explicit salt is set", () => {
    const expected = createHash("sha256").update(FAKE_DATABASE_URL).digest("hex");
    expect(rateLimitSalt({ DATABASE_URL: FAKE_DATABASE_URL })).toBe(expected);
    expect(rateLimitSalt({ RATE_LIMIT_SALT: "", DATABASE_URL: FAKE_DATABASE_URL })).toBe(expected);
  });

  it("returns an empty salt when neither variable is set (local PGlite)", () => {
    expect(rateLimitSalt({})).toBe("");
    expect(rateLimitSalt({ RATE_LIMIT_SALT: "" })).toBe("");
  });
});
