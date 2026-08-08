import { ForgotPasswordForm } from "@/features/auth/components/auth-forms";
import { redirectSignedInUser } from "@/features/auth/server/route-context";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  await redirectSignedInUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Восстановление пароля</h1>
        <p className="mt-2 text-sm text-muted-foreground">Укажите email аккаунта Rollcall.</p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
