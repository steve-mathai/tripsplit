import type { NextConfig } from "next";

/**
 * Strictest policy this build allows. A nonce-based CSP needs dynamic rendering, which
 * cacheComponents (prerendered shell with inline RSC scripts) rules out, hence 'unsafe-inline'.
 * Development adds 'unsafe-eval' (React refresh) and ws: (HMR socket); production adds
 * upgrade-insecure-requests, which would break plain-http LAN testing in dev.
 */
function contentSecurityPolicy(isDevelopment: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${isDevelopment ? " ws:" : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // PGlite loads a WASM file by path at runtime, so it must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // The largest real action payload is an expense with a few dozen splits (a few KB).
  experimental: { serverActions: { bodySizeLimit: "64kb" } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy(process.env.NODE_ENV === "development") },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // The trip slug in the URL is the secret, so never send it as a Referer.
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
