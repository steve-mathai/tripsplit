import { describe, expect, it } from "vitest";
import {
  BALANCE_ROWS,
  BILL_ROWS,
  CATEGORY_ROWS,
  DAY_ONE_OPTIONS,
  GROUP_MESSAGE_LINES,
  PAYMENT_COUNT,
  PEOPLE_COUNT,
  TOTAL_PAISE,
  TRANSFERS,
} from "./demo";

describe("landing demo figures", () => {
  it("balances sum to zero and the payments clear them", () => {
    expect(BALANCE_ROWS.reduce((sum, row) => sum + row.netPaise, 0)).toBe(0);
    const net = new Map(BALANCE_ROWS.map((row) => [row.name, row.netPaise]));
    for (const t of TRANSFERS) {
      net.set(t.from.name, (net.get(t.from.name) ?? 0) + t.amountPaise);
      net.set(t.to.name, (net.get(t.to.name) ?? 0) - t.amountPaise);
    }
    expect([...net.values()].every((v) => v === 0)).toBe(true);
  });

  it("has fewer payments than people and a message line per payment", () => {
    expect(PEOPLE_COUNT).toBe(11);
    expect(PAYMENT_COUNT).toBeLessThan(PEOPLE_COUNT);
    expect(GROUP_MESSAGE_LINES).toHaveLength(PAYMENT_COUNT + 1);
    expect(GROUP_MESSAGE_LINES[0]).toBe("Kochi Gang 2026 - settle up");
  });

  it("categories add up to the total and day one carries the 5 in, 1 out vote", () => {
    expect(CATEGORY_ROWS.reduce((sum, row) => sum + row.amountPaise, 0)).toBe(TOTAL_PAISE);
    expect(BILL_ROWS).toHaveLength(4);
    expect(DAY_ONE_OPTIONS.map((o) => `${o.yes} in, ${o.no} out`)).toContain("5 in, 1 out");
  });
});
