import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { db, usingNeon } from "./index";

const migrationsFolder = "./drizzle";

async function main() {
  if (usingNeon) {
    await migrateNeon(db as unknown as NeonHttpDatabase, { migrationsFolder });
  } else {
    await migratePglite(db as unknown as PgliteDatabase, { migrationsFolder });
  }
  console.log(`Migrations applied (${usingNeon ? "Neon" : "PGlite"}).`);
}

main()
  .then(() => process.exit(0)) // PGlite keeps a handle open otherwise
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
