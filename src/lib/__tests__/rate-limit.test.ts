import { describe, expect, it } from "vitest";
import { clientIp, rateLimitKey, UNKNOWN_CLIENT } from "../rate-limit";

const headers = (values: Record<string, string>) => (name: string) => values[name] ?? null;

describe("clientIp", () => {
  it("takes the first x-forwarded-for hop", () => {
    expect(clientIp(headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then to a shared key", () => {
    expect(clientIp(headers({ "x-real-ip": "198.51.100.9" }))).toBe("198.51.100.9");
    expect(clientIp(headers({}))).toBe(UNKNOWN_CLIENT);
  });

  it("does not trust values that are not IP addresses", () => {
    expect(clientIp(headers({ "x-forwarded-for": "<script>, 1.2.3.4" }))).toBe(UNKNOWN_CLIENT);
    expect(clientIp(headers({ "x-forwarded-for": "1.2.3.4.5" }))).toBe(UNKNOWN_CLIENT);
  });

  it("keys IPv6 on the /64 prefix so rotating host addresses share one counter", () => {
    const a = clientIp(headers({ "x-forwarded-for": "2001:db8:abcd:12::1" }));
    const b = clientIp(headers({ "x-forwarded-for": "2001:0DB8:abcd:0012:ffff:ffff:ffff:ffff" }));
    expect(a).toBe("2001:db8:abcd:12");
    expect(b).toBe(a);
    expect(clientIp(headers({ "x-forwarded-for": "2001:db8:abcd:13::1" }))).not.toBe(a);
  });

  it("treats an IPv4-mapped IPv6 address as its IPv4", () => {
    expect(clientIp(headers({ "x-forwarded-for": "::ffff:192.0.2.5" }))).toBe("192.0.2.5");
  });
});

describe("rateLimitKey", () => {
  it("is a SHA-256 hex digest that does not contain the IP", () => {
    const key = rateLimitKey("203.0.113.7", "write", "trip-1");
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain("203.0.113.7");
  });

  it("is stable and differs by ip, action, trip and salt", () => {
    const base = rateLimitKey("1.1.1.1", "write", "t1", "s");
    expect(rateLimitKey("1.1.1.1", "write", "t1", "s")).toBe(base);
    expect(rateLimitKey("1.1.1.2", "write", "t1", "s")).not.toBe(base);
    expect(rateLimitKey("1.1.1.1", "create-trip", "t1", "s")).not.toBe(base);
    expect(rateLimitKey("1.1.1.1", "write", "t2", "s")).not.toBe(base);
    expect(rateLimitKey("1.1.1.1", "write", "t1", "other")).not.toBe(base);
  });

  it("does not let fields blend into each other", () => {
    expect(rateLimitKey("a", "bc", "")).not.toBe(rateLimitKey("a", "b", "c"));
  });
});
