import { createHmac, timingSafeEqual } from "node:crypto";

function signature(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createPendingVerificationToken(email: string, secret: string) {
  const encodedEmail = Buffer.from(email.trim().toLowerCase()).toString("base64url");
  return `${encodedEmail}.${signature(encodedEmail, secret)}`;
}

export function readPendingVerificationToken(value: string, secret: string) {
  const [encodedEmail, suppliedSignature, extra] = value.split(".");
  if (!encodedEmail || !suppliedSignature || extra) return null;
  const expectedSignature = signature(encodedEmail, secret);
  if (suppliedSignature.length !== expectedSignature.length) return null;
  if (!timingSafeEqual(Buffer.from(suppliedSignature), Buffer.from(expectedSignature))) return null;

  let email: string;
  try {
    email = Buffer.from(encodedEmail, "base64url").toString("utf8").trim().toLowerCase();
  } catch {
    return null;
  }
  if (!email || email.length > 256 || !email.includes("@")) return null;
  return email;
}
