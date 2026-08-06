import { config } from "dotenv";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { executeSql } from "../src/server/db/runtime";

config({ path: ".env.local" });

async function main() {
  const directory = resolve("src/server/db/migrations");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    await executeSql(await readFile(resolve(directory, file), "utf8"));
    console.log(`Applied ${file}`);
  }
  console.log(`Migrations complete (${process.env.DEMO_MODE === "true" ? "local PGlite" : "Neon"}).`);
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
