import { describe, expect, it } from "vitest";
import { formatINR, parseINR } from "../money";

describe("formatINR", () => {
  it("uses en-IN lakh/crore grouping", () => {
    expect(formatINR(12345678)).toBe("₹1,23,456.78");
    expect(formatINR(12345600)).toBe("₹1,23,456");
    expect(formatINR(12345670000)).toBe("₹12,34,56,700");
  });

  it("shows paise only when non-zero", () => {
    expect(formatINR(123450)).toBe("₹1,234.50");
    expect(formatINR(123400)).toBe("₹1,234");
    expect(formatINR(5)).toBe("₹0.05");
    expect(formatINR(0)).toBe("₹0");
  });

  it("does not group below four digits", () => {
    expect(formatINR(99900)).toBe("₹999");
    expect(formatINR(100000)).toBe("₹1,000");
  });

  it("keeps the sign for negatives", () => {
    expect(formatINR(-124000)).toBe("-₹1,240");
  });

  it("agrees with Intl en-IN for whole rupees", () => {
    for (const rupees of [1, 99, 1000, 99999, 100000, 1234567, 98765432]) {
      expect(formatINR(rupees * 100)).toBe(`₹${new Intl.NumberFormat("en-IN").format(rupees)}`);
    }
  });

  it("rejects non-finite input", () => {
    expect(() => formatINR(Number.NaN)).toThrow(RangeError);
  });
});

describe("parseINR", () => {
  it("parses plain, comma and symbol forms", () => {
    expect(parseINR("1234")).toBe(123400);
    expect(parseINR("1,234.5")).toBe(123450);
    expect(parseINR("₹ 1234")).toBe(123400);
    expect(parseINR("Rs. 99")).toBe(9900);
    expect(parseINR("INR 1,23,456.78")).toBe(12345678);
    expect(parseINR("  250  ")).toBe(25000);
  });

  it("accepts a bare fraction or trailing dot", () => {
    expect(parseINR(".5")).toBe(50);
    expect(parseINR("12.")).toBe(1200);
  });

  it("rounds to the nearest paisa, half up", () => {
    expect(parseINR("1.004")).toBe(100);
    expect(parseINR("1.005")).toBe(101);
    expect(parseINR("1.999")).toBe(200);
    expect(parseINR("0.995")).toBe(100);
  });

  it("rejects negatives and garbage", () => {
    for (const bad of ["", "   ", "-5", "₹-5", "abc", "12abc", "1.2.3", ".", "₹", "1e5", "12,,34x"]) {
      expect(parseINR(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("rejects absurdly long numbers instead of losing precision", () => {
    expect(parseINR("12345678901")).toBeNull();
  });

  it("round-trips formatINR output", () => {
    for (const paise of [1, 99, 100, 123450, 12345678, 99999999]) {
      expect(parseINR(formatINR(paise))).toBe(paise);
    }
  });
});
