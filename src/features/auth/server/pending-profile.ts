import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { getAuthEnv } from "@/features/auth/server/neon-auth";

const COOKIE_NAME = "rollcall.pending-auth-profile";
const MAX_AGE_SECONDS = 30 * 60;

interface PendingProfile {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  expiresAt: number;
}

function sign(payload: string): string {
  return createHmac("sha256", getAuthEnv().NEON_AUTH_COOKIE_SECRET)
    .update(payload)
    .digest("base64url");
}

export async function setPendingAuthProfile(
  profile: Omit<PendingProfile, "expiresAt">,
): Promise<void> {
  const payload = Buffer.from(
    JSON.stringify({
      ...profile,
      expiresAt: Date.now() + MAX_AGE_SECONDS * 1000,
    }),
  ).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/auth",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function consumePendingAuthProfile(
  userId: string,
  email: string,
): Promise<Pick<PendingProfile, "userId" | "firstName" | "lastName"> | undefined> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  cookieStore.delete(COOKIE_NAME);
  if (!raw) return undefined;

  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return undefined;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as PendingProfile;
    if (
      parsed.expiresAt < Date.now() ||
      parsed.userId !== userId ||
      parsed.email !== email
    ) {
      return undefined;
    }
    return {
      userId: parsed.userId,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
    };
  } catch {
    return undefined;
  }
}
