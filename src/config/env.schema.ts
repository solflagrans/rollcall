import { z } from "zod";

export const serverEnvSchema = z.object({
  DATABASE_URL: z.url("DATABASE_URL должен быть корректным URL"),
});

export const publicEnvSchema = z.object({});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;
