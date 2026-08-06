import { PGlite } from "@electric-sql/pglite";
import { Pool } from "@neondatabase/serverless";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export async function executeSql(source: string) {
  if (process.env.DEMO_MODE === "true") {
    const dataDir = process.env.PGLITE_DATA_DIR ?? ".data/rollcall";
    mkdirSync(dirname(dataDir), { recursive: true });
    const client = new PGlite(dataDir);
    await client.exec(source);
    await client.close();
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(source);
  await pool.end();
}
