import { SignInForm } from "@/features/auth/components/auth-forms";
import { redirectSignedInUser } from "@/features/auth/server/route-context";

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  await redirectSignedInUser();
  const { notice } = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Вход в Rollcall</h1>
        <p className="mt-2 text-sm text-muted-foreground">Используйте email и пароль своего аккаунта.</p>
      </div>
      {notice === "password-reset" ? (
        <p role="status" className="rounded-sm border border-primary/20 bg-accent p-3 text-sm text-accent-foreground">Пароль изменён. Теперь можно войти.</p>
      ) : null}
      <SignInForm />
    </div>
  );
}
