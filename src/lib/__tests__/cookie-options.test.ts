import { describe, expect, it } from "vitest";
import { identityCookieOptions } from "../cookie-options";

describe("identityCookieOptions", () => {
  it("is Secure, HttpOnly, Lax and scoped to the trip in production", () => {
    expect(identityCookieOptions("goa-xyz", true)).toEqual({
      path: "/t/goa-xyz",
      maxAge: 31_536_000,
      sameSite: "lax",
      httpOnly: true,
      secure: true,
    });
  });

  it("is not Secure outside production so http://localhost keeps working", () => {
    expect(identityCookieOptions("goa-xyz", false).secure).toBe(false);
  });
});
