import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import { hitCounter, peekCounter } from "../rate-limit";

// In-memory PGlite (no data directory, so no clash with .data), migrated with the real generated SQL.
const client = drizzle(new PGlite());

// Booting PGlite (WASM) and running every migration can take well over 10s on a loaded machine.
beforeAll(async () => {
  await migrate(client, { migrationsFolder: "./drizzle" });
}, 60_000);

describe("hitCounter", () => {
  it("counts hits in a window, so the 6th hit of a limit of 5 is over it", async () => {
    const counts = [];
    for (let i = 0; i < 6; i++) counts.push(await hitCounter(client, "k-basic", 60));
    expect(counts).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("keeps separate counters per key", async () => {
    await hitCounter(client, "k-a", 60);
    await hitCounter(client, "k-a", 60);
    expect(await hitCounter(client, "k-b", 60)).toBe(1);
  });

  it("restarts the count once the window has passed", async () => {
    await hitCounter(client, "k-old", 60);
    await hitCounter(client, "k-old", 60);
    await client.execute(sql`update rate_limits set window_start = now() - interval '2 minutes' where key = 'k-old'`);
    expect(await hitCounter(client, "k-old", 60)).toBe(1);
    expect(await hitCounter(client, "k-old", 60)).toBe(2);
  });
});

describe("peekCounter", () => {
  it("reads without counting and ignores expired windows", async () => {
    expect(await peekCounter(client, "k-peek", 60)).toBe(0);
    await hitCounter(client, "k-peek", 60);
    expect(await peekCounter(client, "k-peek", 60)).toBe(1);
    expect(await peekCounter(client, "k-peek", 60)).toBe(1);
    await client.execute(sql`update rate_limits set window_start = now() - interval '2 minutes' where key = 'k-peek'`);
    expect(await peekCounter(client, "k-peek", 60)).toBe(0);
  });
});
