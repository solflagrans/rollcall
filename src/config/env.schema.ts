import { z } from "zod";

export const serverEnvSchema = z.object({
  DATABASE_URL: z.url("DATABASE_URL должен быть корректным URL"),
  DATABASE_URL_UNPOOLED: z
    .url("DATABASE_URL_UNPOOLED должен быть корректным URL")
    .optional(),
});

export const publicEnvSchema = z.object({});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;
