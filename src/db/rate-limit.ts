import { sql, type SQL } from "drizzle-orm";
import { headers } from "next/headers";
import { UserError } from "../lib/errors";
import { clientIp, rateLimitKey } from "../lib/rate-limit";
import { db, type Db } from "./index";

type Executor = Pick<Db, "execute">;

type CountRow = { count: number | string };

// Db is generic over the driver, so execute() is typed unknown; both drivers return { rows }.
async function queryRows(client: Executor, query: SQL): Promise<CountRow[]> {
  return ((await client.execute(query)) as { rows: CountRow[] }).rows;
}

/**
 * Counts one hit in the key's fixed window and returns the new count, in a single atomic
 * statement (one round trip on neon-http, works unchanged on PGlite). An expired window restarts at 1.
 */
export async function hitCounter(client: Executor, key: string, windowSeconds: number): Promise<number> {
  const rows = await queryRows(client, sql`
    insert into rate_limits (key, window_start, count) values (${key}, now(), 1)
    on conflict (key) do update set
      count = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}::double precision)
                   then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}::double precision)
                          then now() else rate_limits.window_start end
    returning count`);
  return Number(rows[0].count);
}

/** Reads the count of a live window without adding a hit. */
export async function peekCounter(client: Executor, key: string, windowSeconds: number): Promise<number> {
  const rows = await queryRows(client, sql`
    select count from rate_limits
    where key = ${key} and window_start >= now() - make_interval(secs => ${windowSeconds}::double precision)`);
  return rows[0] ? Number(rows[0].count) : 0;
}

const CLEANUP_PROBABILITY = 0.01;
const CLEANUP_AFTER_SECONDS = 24 * 60 * 60; // longer than any window, so only dead rows go

/** No cron exists, so a small share of calls sweeps expired rows. */
async function sweepExpired(client: Executor): Promise<void> {
  if (Math.random() >= CLEANUP_PROBABILITY) return;
  await client.execute(sql`delete from rate_limits where window_start < now() - make_interval(secs => ${CLEANUP_AFTER_SECONDS}::double precision)`);
}

export interface Bucket {
  action: string;
  limit: number;
  window: number;
}

async function currentKey(bucket: Bucket, tripId?: string): Promise<string> {
  const requestHeaders = await headers();
  return rateLimitKey(clientIp((name) => requestHeaders.get(name)), bucket.action, tripId, process.env.RATE_LIMIT_SALT);
}

/**
 * Counts a hit for the current client and returns the new count, or null if the limiter itself
 * failed (for example the table is not migrated yet): a broken limiter must not take the app down.
 */
async function hit(bucket: Bucket, tripId?: string): Promise<number | null> {
  try {
    const count = await hitCounter(db, await currentKey(bucket, tripId), bucket.window);
    await sweepExpired(db);
    return count;
  } catch (error) {
    console.error("rate limiter unavailable, allowing request", error);
    return null;
  }
}

/** Counts a hit and throws UserError(message) once the current client is over the bucket's limit. */
export async function enforceLimit(bucket: Bucket, message: string, tripId?: string): Promise<void> {
  const count = await hit(bucket, tripId);
  if (count !== null && count > bucket.limit) throw new UserError(message);
}

/** Counts a hit without ever refusing (used to record not-found slugs). */
export async function recordHit(bucket: Bucket): Promise<void> {
  await hit(bucket);
}

/** True when the current client has used up the bucket. Same fail-open rule as enforceLimit. */
export async function isOverLimit(bucket: Bucket): Promise<boolean> {
  try {
    return (await peekCounter(db, await currentKey(bucket), bucket.window)) >= bucket.limit;
  } catch (error) {
    console.error("rate limiter unavailable, allowing request", error);
    return false;
  }
}
