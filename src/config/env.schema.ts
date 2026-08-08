import { z } from "zod";

export const serverEnvSchema = z.object({
  DATABASE_URL: z.url("DATABASE_URL должен быть корректным URL"),
  DATABASE_URL_UNPOOLED: z
    .url("DATABASE_URL_UNPOOLED должен быть корректным URL")
    .optional(),
});

export const publicEnvSchema = z.object({});

export const authEnvSchema = z.object({
  NEON_AUTH_BASE_URL: z.url("NEON_AUTH_BASE_URL должен быть корректным URL"),
  NEON_AUTH_COOKIE_SECRET: z
    .string()
    .min(32, "NEON_AUTH_COOKIE_SECRET должен содержать не менее 32 символов"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type AuthEnv = z.infer<typeof authEnvSchema>;
