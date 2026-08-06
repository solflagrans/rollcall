import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/features/auth/register-form";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getAppSession, getAuthIdentity } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await getAppSession();
  if (session) redirect(session.role === "student" ? "/student" : "/dashboard");
  if (await getAuthIdentity()) redirect("/onboarding");

  return <main className="login-page"><section className="login-card" aria-labelledby="register-heading">
    <div className="login-brand"><Link href="/login" className="brand"><span className="brand-mark"><BookOpenCheck size={21} /></span><span>Перекличка</span></Link><ThemeToggle /></div>
    <h1 id="register-heading">Создайте аккаунт</h1><p>После подтверждения email вы настроите свою учебную группу</p>
    <RegisterForm />
    <p className="auth-switch">Уже есть аккаунт? <Link href="/login">Войти</Link></p>
  </section></main>;
}
