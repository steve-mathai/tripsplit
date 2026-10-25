import { mkdirSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { PGlite } from "@electric-sql/pglite";
import type { BatchItem } from "drizzle-orm/batch";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/** True when DATABASE_URL points at Neon; otherwise an embedded PGlite is used. */
export const usingNeon = Boolean(process.env.DATABASE_URL);

export const PGLITE_DIR = "./.data/pglite";

// Cached on globalThis so Next dev hot reloads reuse one connection (PGlite allows only one
// process-wide handle on its data dir).
const globalForDb = globalThis as unknown as { __tripsplitDb?: Db };

function createDb(): Db {
  if (process.env.DATABASE_URL) {
    return drizzleNeon(neon(process.env.DATABASE_URL), { schema });
  }
  // Vercel's filesystem is read-only/ephemeral: an embedded PGlite there would silently lose data.
  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is not set. Set DATABASE_URL to your Neon connection string.");
  }
  mkdirSync(PGLITE_DIR, { recursive: true }); // PGlite creates only the last path segment
  return drizzlePglite(new PGlite(PGLITE_DIR), { schema });
}

function getDb(): Db {
  return (globalForDb.__tripsplitDb ??= createDb());
}

// Lazy: the connection opens on first use, not on import, so `next build` workers that only
// import this module never try to open (and lock) the PGlite data dir.
export const db = new Proxy({} as Db, {
  get(_target, property) {
    const real = getDb();
    const value = Reflect.get(real, property, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export type Statement = BatchItem<"pg">;

/**
 * Runs several writes as one all-or-nothing transaction. `build` receives the client to
 * build them on and must not await them. neon-http has no transaction(), but its batch()
 * sends every statement in a single transaction over HTTP; PGlite uses a normal one.
 * Statements cannot read each other's results, so generate ids before calling.
 */
export async function runAtomically(build: (client: Db) => [Statement, ...Statement[]]): Promise<void> {
  if (usingNeon) {
    await (db as unknown as NeonHttpDatabase<typeof schema>).batch(build(db));
    return;
  }
  await db.transaction(async (tx) => {
    for (const statement of build(tx)) await statement;
  });
}
