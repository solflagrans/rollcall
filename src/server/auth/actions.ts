"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { profiles } from "@/server/db/schema";
import { clearSession, getAppSession, getAuthIdentity, setDemoSession } from "./session";
import { isEmailNotVerifiedError, isExistingUserError, signupErrorMessage } from "./error-messages";
import { setPendingVerificationEmail } from "./pending-verification";

const loginSchema = z.object({ email: z.email(), password: z.string().min(8).max(100) });

export type LoginState = { error?: string; verificationPending?: boolean };
export type RegisterState = { error?: string };

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  password: z.string().min(8).max(100),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"] });

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Проверьте email и пароль" };

  try {
    if (process.env.DEMO_MODE === "true") {
      if (parsed.data.password !== "demo12345") return { error: "Неверный email или пароль" };
      const [profile] = await db.select({ authUserId: profiles.authUserId }).from(profiles).where(eq(profiles.email, parsed.data.email.toLowerCase())).limit(1);
      if (!profile) return { error: "Неверный email или пароль" };
      await setDemoSession(profile.authUserId);
    } else {
      const { neonAuth } = await import("./neon");
      const result = await neonAuth.signIn.email(parsed.data);
      if (result.error) {
        if (isEmailNotVerifiedError(result.error)) {
          await setPendingVerificationEmail(parsed.data.email);
          return { error: "Email ещё не подтверждён", verificationPending: true };
        }
        return { error: "Неверный email или пароль" };
      }
    }
  } catch {
    return { error: "Сервис временно недоступен. Попробуйте ещё раз" };
  }

  const identity = await getAuthIdentity();
  const session = await getAppSession();
  if (identity && !session) redirect("/onboarding");
  if (!session?.isActive) {
    await clearSession();
    return { error: "Аккаунт деактивирован. Обратитесь к старосте" };
  }
  redirect(session.role === "student" ? "/student" : "/dashboard");
}

export async function registerAction(_state: RegisterState, formData: FormData): Promise<RegisterState> {
  if (process.env.DEMO_MODE === "true") return { error: "Регистрация доступна в версии с Neon Auth" };
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: "Проверьте имя, email и совпадение паролей" };

  let destination = "/onboarding";
  try {
    const { neonAuth } = await import("./neon");
    const result = await neonAuth.signUp.email({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
    });
    if (result.error) {
      if (isExistingUserError(result.error)) {
        return { error: "Аккаунт с таким email уже существует. Войдите с указанным при регистрации паролем." };
      }
      const requestHeaders = await headers();
      console.error("Neon Auth signup rejected", {
        code: result.error.code,
        message: result.error.message,
        origin: requestHeaders.get("origin"),
        host: requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
        protocol: requestHeaders.get("x-forwarded-proto"),
      });
      return { error: signupErrorMessage(result.error) };
    }
    if (!result.data?.user) {
      console.error("Neon Auth signup returned no user");
      return { error: "Neon Auth не вернул созданного пользователя" };
    }
    if (!result.data.user.emailVerified) {
      await setPendingVerificationEmail(result.data.user.email);
      destination = "/verify-email?sent=1";
    }
  } catch (error) {
    console.error("Neon Auth signup request failed", error instanceof Error ? error.message : "Unknown error");
    return { error: "Сервис регистрации временно недоступен" };
  }

  redirect(destination);
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
