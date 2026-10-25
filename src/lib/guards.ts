// Server actions receive whatever a client chooses to send, so TypeScript types do not hold
// at runtime. These narrow `unknown` input before it is read.

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (options as readonly string[]).includes(value);
}
