import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { VerificationCodeForm, VerificationRequestForm } from "@/features/auth/email-verification-form";
import { getAuthIdentity } from "@/server/auth/session";
import { getPendingVerificationEmail } from "@/server/auth/pending-verification";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const identity = await getAuthIdentity();
  if (identity?.emailVerified) redirect("/onboarding");

  const email = identity?.email ?? await getPendingVerificationEmail();
  const codeSent = (await searchParams).sent === "1";

  return <main className="login-page"><section className="login-card" aria-labelledby="verify-email-heading">
    <div className="login-brand"><Link href="/login" className="brand"><span className="brand-mark"><BookOpenCheck size={21} /></span><span>Перекличка</span></Link><ThemeToggle /></div>
    <h1 id="verify-email-heading">Подтвердите email</h1>
    <p>{email ? "Введите код подтверждения из письма" : "Введите данные созданного аккаунта. Код будет отправлен только после проверки пароля"}</p>
    {email ? <VerificationCodeForm email={email} codeSent={codeSent} /> : <VerificationRequestForm />}
    <p className="auth-switch"><Link href="/login">Вернуться ко входу</Link></p>
  </section></main>;
}
