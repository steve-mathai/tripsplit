import { describe, expect, it } from "vitest";
import { isDemoWriteBlocked } from "../demo-guard";
import { UserError } from "../errors";
import { MAX_AMOUNT_PAISE } from "../money";
import { isSuggestedTransfer } from "../settle-plan";
import { parseMarkPaidInput } from "../settlement";

describe("parseMarkPaidInput", () => {
  it("accepts a valid payment and reads the round flag strictly", () => {
    expect(parseMarkPaidInput({ from: "a", to: "b", amountPaise: 12345 })).toEqual({ from: "a", to: "b", amountPaise: 12345, round: false });
    expect(parseMarkPaidInput({ from: "a", to: "b", amountPaise: MAX_AMOUNT_PAISE, round: true }).round).toBe(true);
    expect(parseMarkPaidInput({ from: "a", to: "b", amountPaise: 100, round: "yes" }).round).toBe(false);
  });

  it.each([
    ["not an object", null],
    ["an array", []],
    ["missing from", { to: "b", amountPaise: 100 }],
    ["numeric to", { from: "a", to: 2, amountPaise: 100 }],
    ["same person", { from: "a", to: "a", amountPaise: 100 }],
    ["zero", { from: "a", to: "b", amountPaise: 0 }],
    ["negative", { from: "a", to: "b", amountPaise: -5 }],
    ["fractional", { from: "a", to: "b", amountPaise: 10.5 }],
    ["string amount", { from: "a", to: "b", amountPaise: "100" }],
    ["NaN", { from: "a", to: "b", amountPaise: Number.NaN }],
    ["over the cap", { from: "a", to: "b", amountPaise: MAX_AMOUNT_PAISE + 1 }],
  ])("rejects %s with a UserError", (_label, raw) => {
    expect(() => parseMarkPaidInput(raw)).toThrow(UserError);
  });
});

describe("isSuggestedTransfer", () => {
  const transfers = [{ from: "a", to: "b", amountPaise: 500 }];
  it("needs the same payer, receiver and amount", () => {
    expect(isSuggestedTransfer(transfers, { from: "a", to: "b", amountPaise: 500 })).toBe(true);
    expect(isSuggestedTransfer(transfers, { from: "a", to: "b", amountPaise: 499 })).toBe(false);
    expect(isSuggestedTransfer(transfers, { from: "b", to: "a", amountPaise: 500 })).toBe(false);
  });
});

describe("isDemoWriteBlocked", () => {
  it("blocks the demo trip in production or with DEMO_READ_ONLY=1", () => {
    expect(isDemoWriteBlocked("demo", "demo", { VERCEL_ENV: "production" })).toBe(true);
    expect(isDemoWriteBlocked("demo", "demo", { DEMO_READ_ONLY: "1" })).toBe(true);
  });

  it("leaves the demo trip editable in dev, preview and tests", () => {
    expect(isDemoWriteBlocked("demo", "demo", {})).toBe(false);
    expect(isDemoWriteBlocked("demo", "demo", { VERCEL_ENV: "preview" })).toBe(false);
    expect(isDemoWriteBlocked("demo", "demo", { DEMO_READ_ONLY: "0" })).toBe(false);
  });

  it("never blocks another trip", () => {
    expect(isDemoWriteBlocked("my-trip", "demo", { VERCEL_ENV: "production", DEMO_READ_ONLY: "1" })).toBe(false);
  });
});
