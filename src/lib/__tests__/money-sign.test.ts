import { describe, expect, it } from "vitest";
import { signedINR } from "../../components/money-sign";

describe("signedINR", () => {
  it("shows what a person gets back as +₹ in the positive tone", () => {
    expect(signedINR(120000)).toEqual({ text: "+₹1,200", tone: "positive" });
  });

  it("shows what a person owes with the U+2212 minus sign, never a hyphen", () => {
    const owes = signedINR(-123450);
    expect(owes).toEqual({ text: "−₹1,234.50", tone: "owes" });
    expect(owes.text.startsWith("-")).toBe(false);
  });

  it("calls zero settled", () => {
    expect(signedINR(0)).toEqual({ text: "settled", tone: "settled" });
    expect(signedINR(-0)).toEqual({ text: "settled", tone: "settled" });
  });
});
