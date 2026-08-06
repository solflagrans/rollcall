import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { executeSql } from "../src/server/db/runtime";

config({ path: ".env.local" });

async function main() {
  const migration = await readFile(resolve("src/server/db/migrations/0000_initial.sql"), "utf8");
  await executeSql(migration);
  console.log(`Migration applied (${process.env.DEMO_MODE === "true" ? "local PGlite" : "Neon"}).`);
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
