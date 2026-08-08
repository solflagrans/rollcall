import Link from "next/link";

import { VerifyEmailForm } from "@/features/auth/components/auth-forms";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Подтвердите email</h1>
        <p className="mt-2 text-sm text-muted-foreground">До подтверждения основное приложение недоступно.</p>
      </div>
      {email ? <VerifyEmailForm email={email} /> : (
        <p className="text-sm text-muted-foreground">Email не указан. <Link className="text-primary hover:underline" href="/auth/sign-up">Вернитесь к регистрации</Link>.</p>
      )}
    </div>
  );
}
