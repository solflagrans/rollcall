import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getServerEnv } from "@/config/env";
import * as schema from "@/server/db/schema";

function createDatabaseClient() {
  const sql = neon(getServerEnv().DATABASE_URL);

  return drizzle(sql, { schema });
}

export type DatabaseClient = ReturnType<typeof createDatabaseClient>;

const globalForDatabase = globalThis as typeof globalThis & {
  rollcallDatabase?: DatabaseClient;
};

export function getDatabase(): DatabaseClient {
  globalForDatabase.rollcallDatabase ??= createDatabaseClient();

  return globalForDatabase.rollcallDatabase;
}
