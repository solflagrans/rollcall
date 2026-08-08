import Link from "next/link";

import { ResetPasswordForm } from "@/features/auth/components/auth-forms";
import { redirectSignedInUser } from "@/features/auth/server/route-context";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  await redirectSignedInUser();
  const { email } = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Новый пароль</h1>
        <p className="mt-2 text-sm text-muted-foreground">Введите код из письма и новый пароль.</p>
      </div>
      {email ? <ResetPasswordForm email={email} /> : (
        <p className="text-sm text-muted-foreground">Сначала <Link className="text-primary hover:underline" href="/auth/forgot-password">запросите код восстановления</Link>.</p>
      )}
    </div>
  );
}
