import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

import { serverEnvSchema } from "./src/config/env.schema";

loadEnvConfig(process.cwd());

const env = process.env.DATABASE_URL
  ? serverEnvSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    })
  : undefined;
const databaseUrl = env?.DATABASE_URL_UNPOOLED ?? env?.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
  strict: true,
  verbose: true,
});
