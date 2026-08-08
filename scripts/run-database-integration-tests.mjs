import { spawnSync } from "node:child_process";
import path from "node:path";

import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), true);

const vitestPath = path.join(
  process.cwd(),
  "node_modules",
  "vitest",
  "vitest.mjs",
);
const result = spawnSync(
  process.execPath,
  [
    vitestPath,
    "run",
    "src/features/lessons/server/drizzle-repository.integration.test.ts",
  ],
  {
    env: { ...process.env, RUN_DATABASE_INTEGRATION: "1" },
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
