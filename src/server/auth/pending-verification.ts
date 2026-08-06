import { cookies } from "next/headers";
import { createPendingVerificationToken, readPendingVerificationToken } from "./verification-token";

const PENDING_VERIFICATION_COOKIE = "rollcall_pending_email_verification";
const ONE_DAY = 60 * 60 * 24;

function verificationSecret() {
  return process.env.NEON_AUTH_COOKIE_SECRET ?? process.env.DEMO_AUTH_SECRET;
}

export async function setPendingVerificationEmail(email: string) {
  const secret = verificationSecret();
  if (!secret) throw new Error("NEON_AUTH_COOKIE_SECRET is required for email verification");
  const value = createPendingVerificationToken(email, secret);
  (await cookies()).set(PENDING_VERIFICATION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_DAY,
    path: "/",
  });
}

export async function getPendingVerificationEmail() {
  const value = (await cookies()).get(PENDING_VERIFICATION_COOKIE)?.value;
  const secret = verificationSecret();
  if (!value || !secret) return null;
  return readPendingVerificationToken(value, secret);
}

export async function clearPendingVerificationEmail() {
  (await cookies()).delete(PENDING_VERIFICATION_COOKIE);
}
