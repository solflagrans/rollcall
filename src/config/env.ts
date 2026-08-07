import "server-only";

import { serverEnvSchema, type ServerEnv } from "@/config/env.schema";

let cachedServerEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cachedServerEnv ??= serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
  });

  return cachedServerEnv;
}
