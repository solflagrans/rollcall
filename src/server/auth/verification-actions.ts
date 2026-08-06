"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { clearSession, getAuthIdentity } from "./session";
import { isEmailNotVerifiedError, verificationErrorMessage } from "./error-messages";
import {
  clearPendingVerificationEmail,
  getPendingVerificationEmail,
  setPendingVerificationEmail,
} from "./pending-verification";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(100),
});
const otpSchema = z.string().trim().regex(/^\d{4,10}$/);

type VerificationState = { error?: string };

export async function requestEmailVerificationAction(
  _state: VerificationState,
  formData: FormData,
): Promise<VerificationState> {
  if (process.env.DEMO_MODE === "true") return { error: "Подтверждение email недоступно в демо-режиме" };

  const identity = await getAuthIdentity();
  if (identity?.emailVerified) redirect("/");
  const pendingEmail = identity?.email ?? await getPendingVerificationEmail();
  let destination = "/verify-email?sent=1";

  try {
    const { neonAuth } = await import("./neon");
    if (pendingEmail) {
      const result = await neonAuth.emailOtp.sendVerificationOtp({
        email: pendingEmail,
        type: "email-verification",
      });
      if (result.error) {
        console.error("Neon Auth verification OTP request rejected", {
          code: result.error.code,
          message: result.error.message,
        });
        return { error: verificationErrorMessage(result.error) };
      }
    } else {
      const parsed = credentialsSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
      });
      if (!parsed.success) return { error: "Проверьте email и пароль" };

      const email = parsed.data.email.toLowerCase();
      const result = await neonAuth.signIn.email({ email, password: parsed.data.password });
      if (!result.error) {
        await clearPendingVerificationEmail();
        destination = "/";
      } else if (isEmailNotVerifiedError(result.error)) {
        await setPendingVerificationEmail(email);
      } else {
        return { error: "Неверный email или пароль" };
      }
    }
  } catch (error) {
    console.error("Neon Auth verification OTP request failed", error instanceof Error ? error.message : "Unknown error");
    return { error: "Сервис подтверждения временно недоступен" };
  }

  redirect(destination);
}

export async function verifyEmailCodeAction(
  _state: VerificationState,
  formData: FormData,
): Promise<VerificationState> {
  if (process.env.DEMO_MODE === "true") return { error: "Подтверждение email недоступно в демо-режиме" };

  const identity = await getAuthIdentity();
  if (identity?.emailVerified) redirect("/");
  const email = identity?.email ?? await getPendingVerificationEmail();
  const parsed = otpSchema.safeParse(formData.get("otp"));
  if (!email) return { error: "Сначала укажите email и запросите код" };
  if (!parsed.success) return { error: "Введите код из письма" };

  let hasSession = false;
  try {
    const { neonAuth } = await import("./neon");
    const result = await neonAuth.emailOtp.verifyEmail({ email, otp: parsed.data });
    if (result.error) return { error: verificationErrorMessage(result.error) };
    await clearPendingVerificationEmail();
    const sessionResult = await neonAuth.getSession({ query: { disableCookieCache: true } });
    hasSession = Boolean(sessionResult.data?.user);
  } catch (error) {
    console.error("Neon Auth email verification failed", error instanceof Error ? error.message : "Unknown error");
    return { error: "Сервис подтверждения временно недоступен" };
  }

  redirect(hasSession ? "/onboarding" : "/login?verified=1");
}

export async function changeVerificationEmailAction() {
  await clearPendingVerificationEmail();
  if (await getAuthIdentity()) await clearSession();
  redirect("/verify-email");
}
