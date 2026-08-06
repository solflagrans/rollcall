import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { Pool } from "@neondatabase/serverless";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

export type AppDatabase = PgliteDatabase<typeof schema>;

const globalDb = globalThis as typeof globalThis & {
  rollcallDb?: AppDatabase;
  rollcallClient?: PGlite | Pool;
};

function createDatabase(): AppDatabase {
  if (process.env.DEMO_MODE === "true") {
    const dataDir = process.env.PGLITE_DATA_DIR ?? ".data/rollcall";
    mkdirSync(dirname(dataDir), { recursive: true });
    const client = new PGlite(dataDir);
    globalDb.rollcallClient = client;
    return drizzlePglite(client, { schema });
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when DEMO_MODE is disabled");
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  globalDb.rollcallClient = pool;
  // Both Drizzle drivers implement the query-builder contract used by the app.
  return drizzleNeon(pool, { schema }) as unknown as AppDatabase;
}

function getDatabase() {
  if (!globalDb.rollcallDb) globalDb.rollcallDb = createDatabase();
  return globalDb.rollcallDb;
}

// Next.js imports route modules while collecting build metadata. A lazy proxy
// avoids opening a database/WASM runtime until a request actually runs a query.
export const db = new Proxy({} as AppDatabase, {
  get(_target, property) {
    const database = getDatabase();
    const value: unknown = Reflect.get(database, property, database);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
