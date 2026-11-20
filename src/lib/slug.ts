// No 0/1/i/l/o so slugs survive being read out loud or retyped from WhatsApp.
export const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
/** 16 characters of a 31-letter alphabet is about 79 bits: the slug is the trip's only secret. */
export const SLUG_SUFFIX_LENGTH = 16;

const STEM_MAX_LENGTH = 20;
// Largest multiple of the alphabet size that fits in a byte. Bytes at or above it are
// discarded so every letter is equally likely (a plain `byte % 31` would favour the first 8).
const UNBIASED_LIMIT = 256 - (256 % SLUG_ALPHABET.length);

type FillRandom = (bytes: Uint8Array) => Uint8Array;

export function randomSuffix(length = SLUG_SUFFIX_LENGTH, fill: FillRandom = (b) => crypto.getRandomValues(b)): string {
  let suffix = "";
  while (suffix.length < length) {
    for (const byte of fill(new Uint8Array(length * 2))) {
      if (byte >= UNBIASED_LIMIT) continue;
      suffix += SLUG_ALPHABET[byte % SLUG_ALPHABET.length];
      if (suffix.length === length) break;
    }
  }
  return suffix;
}

/** Readable name stem plus an unguessable random suffix, e.g. goa-trip-k3x9m2q7w4h8n5pz. */
export function slugFromName(name: string, fill?: FillRandom): string {
  const stem =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, STEM_MAX_LENGTH)
      .replace(/-+$/, "") || "trip";
  return `${stem}-${randomSuffix(SLUG_SUFFIX_LENGTH, fill)}`;
}
