"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { profiles } from "@/server/db/schema";
import { clearSession, getAppSession, getAuthIdentity, setDemoSession } from "./session";

const loginSchema = z.object({ email: z.email(), password: z.string().min(8).max(100) });

export type LoginState = { error?: string };
export type RegisterState = { error?: string; ok?: boolean; email?: string };

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
      if (result.error) return { error: "Неверный email или пароль" };
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

  try {
    const { neonAuth } = await import("./neon");
    const result = await neonAuth.signUp.email({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      callbackURL: "/onboarding",
    });
    if (result.error || !result.data?.user) return { error: "Не удалось создать аккаунт. Возможно, email уже используется" };
    if (!result.data.user.emailVerified) return { ok: true, email: result.data.user.email };
  } catch {
    return { error: "Сервис регистрации временно недоступен" };
  }

  redirect("/onboarding");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
