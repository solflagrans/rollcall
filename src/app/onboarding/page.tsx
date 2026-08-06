import { BookOpenCheck, MailCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/features/auth/onboarding-form";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getAppSession, getAuthIdentity } from "@/server/auth/session";
import { logoutAction } from "@/server/auth/actions";

export const dynamic = "force-dynamic";

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function OnboardingPage() {
  const identity = await getAuthIdentity();
  if (!identity) redirect("/login");
  const session = await getAppSession();
  if (session) redirect(session.role === "student" ? "/student" : "/dashboard");

  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + 5);

  return <main className="login-page"><section className="login-card onboarding-card" aria-labelledby="onboarding-heading">
    <div className="login-brand"><div className="brand"><span className="brand-mark"><BookOpenCheck size={21} /></span><span>Перекличка</span></div><ThemeToggle /></div>
    {!identity.emailVerified ? <div className="auth-notice"><MailCheck size={28} /><h1 id="onboarding-heading">Подтвердите email</h1><p>Откройте письмо, отправленное на {identity.email}, затем войдите снова. Создать группу можно только после подтверждения адреса.</p><form action={logoutAction}><button className="button" type="submit">Вернуться ко входу</button></form></div> : <>
      <h1 id="onboarding-heading">Настройте учебную группу</h1><p>{identity.displayName}, укажите текущую организацию учебного года. Название периода сформируется автоматически.</p>
      <OnboardingForm defaultStart={toDateInput(start)} defaultEnd={toDateInput(end)} />
    </>}
  </section></main>;
}
