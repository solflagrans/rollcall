"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { profiles } from "@/server/db/schema";
import { clearSession, getAppSession, setDemoSession } from "./session";

const loginSchema = z.object({ email: z.email(), password: z.string().min(8).max(100) });

export type LoginState = { error?: string };

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

  const session = await getAppSession();
  if (!session?.isActive) {
    await clearSession();
    return { error: "Аккаунт деактивирован. Обратитесь к старосте" };
  }
  redirect(session.role === "student" ? "/student" : "/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
