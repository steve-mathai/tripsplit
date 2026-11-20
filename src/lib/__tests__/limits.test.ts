import { describe, expect, it } from "vitest";
import { UserError } from "../errors";
import { assertRoomFor } from "../limits";
import { MAX_EXPENSES, MAX_MEMBERS, MAX_PLAN_ITEMS, TEXT_LIMITS } from "../types";

describe("assertRoomFor", () => {
  it("allows up to the cap and refuses the next one", () => {
    expect(() => assertRoomFor(MAX_MEMBERS - 1, MAX_MEMBERS, "people")).not.toThrow();
    expect(() => assertRoomFor(MAX_MEMBERS, MAX_MEMBERS, "people")).toThrow(UserError);
    expect(() => assertRoomFor(MAX_MEMBERS, MAX_MEMBERS, "people")).toThrow("maximum of 50 people");
  });

  it("has the documented caps", () => {
    expect([MAX_MEMBERS, MAX_PLAN_ITEMS, MAX_EXPENSES]).toEqual([50, 500, 500]);
    expect(TEXT_LIMITS.upiId).toBe(50);
  });
});
