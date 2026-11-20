import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../../next.config";

async function headerMap() {
  const rules = await nextConfig.headers!();
  expect(rules).toHaveLength(1);
  expect(rules[0].source).toBe("/:path*");
  return Object.fromEntries(rules[0].headers.map((h) => [h.key, h.value]));
}

afterEach(() => vi.unstubAllEnvs());

describe("security headers", () => {
  it("sets the full header set in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const headers = await headerMap();
    expect(headers).toMatchObject({
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cross-Origin-Opener-Policy": "same-origin",
    });
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["Permissions-Policy"]).toContain("usb=()");
    const csp = headers["Content-Security-Policy"];
    for (const directive of [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ]) {
      expect(csp.split("; ")).toContain(directive);
    }
    expect(csp).not.toContain("unsafe-eval");
  });

  it("allows unsafe-eval and websockets only in development, and never upgrades to https", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const csp = (await headerMap())["Content-Security-Policy"];
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(csp).toContain("connect-src 'self' ws:");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("limits server action bodies to 64kb", () => {
    expect(nextConfig.experimental?.serverActions?.bodySizeLimit).toBe("64kb");
  });
});
