import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

import { serverEnvSchema } from "./src/config/env.schema";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL
  ? serverEnvSchema.parse({ DATABASE_URL: process.env.DATABASE_URL }).DATABASE_URL
  : undefined;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
  strict: true,
  verbose: true,
});
