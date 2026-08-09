import { SignUpForm } from "@/features/auth/components/auth-forms";
import { redirectSignedInUser } from "@/features/auth/server/route-context";

export const dynamic = "force-dynamic";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  await redirectSignedInUser(returnTo);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Регистрация</h1>
        <p className="mt-2 text-sm text-muted-foreground">Роль в группе назначается отдельно и не является частью аккаунта.</p>
      </div>
      <SignUpForm returnTo={returnTo} />
    </div>
  );
}
