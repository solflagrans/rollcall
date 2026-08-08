import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";
import { headers } from "next/headers";

import { authEnvSchema, type AuthEnv } from "@/config/env.schema";

let cachedAuthEnv: AuthEnv | undefined;

export function getAuthEnv(): AuthEnv {
  cachedAuthEnv ??= authEnvSchema.parse({
    NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL,
    NEON_AUTH_COOKIE_SECRET: process.env.NEON_AUTH_COOKIE_SECRET,
  });
  return cachedAuthEnv;
}

const env = getAuthEnv();

export const auth = createNeonAuth({
  baseUrl: env.NEON_AUTH_BASE_URL,
  cookies: {
    secret: env.NEON_AUTH_COOKIE_SECRET,
    sessionDataTtl: 60,
  },
});

type ResetPasswordWithEmailOtpInput = {
  email: string;
  otp: string;
  password: string;
};

type ResetPasswordWithEmailOtpResult =
  | { data: { success: boolean }; error: null }
  | {
      data: null;
      error: {
        code?: string;
        message: string;
        status: number;
        statusText: string;
      };
    };

function readErrorProperty(body: unknown, property: "code" | "error" | "message") {
  if (!body || typeof body !== "object" || !(property in body)) return undefined;
  const value = (body as Record<string, unknown>)[property];
  return typeof value === "string" ? value : undefined;
}

function getRequestOrigin(requestHeaders: Headers) {
  const explicitOrigin = requestHeaders.get("origin");
  if (explicitOrigin) return explicitOrigin;

  const referer = requestHeaders.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // Fall through to the forwarded host below.
    }
  }

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  return host ? `${protocol}://${host}` : "http://localhost";
}

/**
 * Uses Neon Auth's public proxy route because @neondatabase/auth 0.4.2-beta maps
 * auth.emailOtp.resetPassword to the obsolete email-otp/passcode path.
 */
export async function resetPasswordWithEmailOtp(
  input: ResetPasswordWithEmailOtpInput,
): Promise<ResetPasswordWithEmailOtpResult> {
  const requestHeaders = await headers();
  const proxyHeaders = new Headers({
    "content-type": "application/json",
    origin: getRequestOrigin(requestHeaders),
  });
  const cookie = requestHeaders.get("cookie");
  if (cookie) proxyHeaders.set("cookie", cookie);

  const route = auth.handler().POST;
  const response = await route(
    new Request(
      new URL("/api/auth/email-otp/reset-password", getRequestOrigin(requestHeaders)),
      {
        method: "POST",
        headers: proxyHeaders,
        body: JSON.stringify(input),
      },
    ),
    {
      params: Promise.resolve({ path: ["email-otp", "reset-password"] }),
    },
  );
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      data: null,
      error: {
        code: readErrorProperty(body, "code"),
        message:
          readErrorProperty(body, "message") ??
          readErrorProperty(body, "error") ??
          response.statusText,
        status: response.status,
        statusText: response.statusText,
      },
    };
  }

  return { data: { success: true }, error: null };
}
