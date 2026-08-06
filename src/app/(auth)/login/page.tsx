import { BookOpenCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/login-form";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getAppSession, getAuthIdentity } from "@/server/auth/session";
import Link from "next/link";

export const dynamic = "force-dynamic";
export default async function LoginPage() {
  const session = await getAppSession();
  if (session) redirect(session.role === "student" ? "/student" : "/dashboard");
  if (await getAuthIdentity()) redirect("/onboarding");
  return <main className="login-page"><section className="login-card" aria-labelledby="login-heading">
    <div className="login-brand"><div className="brand"><span className="brand-mark"><BookOpenCheck size={21} /></span><span>Перекличка</span></div><ThemeToggle /></div>
    <h1 id="login-heading">С возвращением</h1><p>Войдите в электронный журнал своей группы</p>
    <LoginForm />
    {process.env.DEMO_MODE !== "true" && <p className="auth-switch">Впервые здесь? <Link href="/register">Создать аккаунт и группу</Link></p>}
    {process.env.DEMO_MODE === "true" && <div className="demo-box"><strong>Демо-доступ</strong><br />Староста: headman@rollcall.test<br />Заместитель: deputy@rollcall.test<br />Студент: student1@rollcall.test<br />Пароль для всех: demo12345</div>}
  </section></main>;
}
