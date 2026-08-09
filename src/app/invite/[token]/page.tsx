import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getCurrentAuthUser } from "@/features/auth/server/authorization";
import { requireAppRouteContext } from "@/features/auth/server/route-context";
import { AppShell } from "@/features/groups/components/app-shell";
import { InviteLinkDecision } from "@/features/invitations/components/invite-link-decision";
import { InvitationServiceError } from "@/features/invitations/server/errors";
import { getInviteLinkDetails } from "@/features/invitations/server/operations";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const returnTo = `/invite/${token}`;
  const user = await getCurrentAuthUser();
  if (!user) redirect(`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  if (!user.emailVerified) {
    redirect(`/auth/verify-email?email=${encodeURIComponent(user.email)}&returnTo=${encodeURIComponent(returnTo)}`);
  }

  const viewer = await requireAppRouteContext();
  let details;
  try {
    details = await getInviteLinkDetails(token);
  } catch (error) {
    if (!(error instanceof InvitationServiceError) && !(error instanceof Error && error.name === "ZodError")) throw error;
  }

  if (!details) {
    return (
      <AppShell viewer={viewer}>
        <section className="mx-auto max-w-xl space-y-4 rounded-md border bg-card p-6 sm:p-8">
          <h1 className="font-heading text-2xl font-semibold">Приглашение недоступно</h1>
          <p className="text-muted-foreground">Ссылка недействительна, отозвана или больше не существует.</p>
          <Button asChild variant="outline"><Link href="/groups">Мои группы</Link></Button>
        </section>
      </AppShell>
    );
  }

  const canAccept =
    details.status === "pending" &&
    details.expiresAt > new Date() &&
    details.member.isActive &&
    !details.member.userId;

  return (
    <AppShell viewer={viewer}>
      <section className="mx-auto max-w-xl space-y-6 rounded-md border bg-card p-6 sm:p-8">
        <header className="space-y-2">
          <p className="text-sm font-medium text-primary">Персональное приглашение</p>
          <h1 className="font-heading text-2xl font-semibold">Подключение к группе</h1>
          <p className="text-muted-foreground">Проверьте данные и подтвердите подключение аккаунта.</p>
        </header>
        <dl className="divide-y rounded-md border bg-background">
          <div className="p-4"><dt className="text-xs text-muted-foreground">Группа</dt><dd className="mt-1 font-medium">{details.group.name}</dd></div>
          <div className="p-4"><dt className="text-xs text-muted-foreground">Запись состава</dt><dd className="mt-1 font-medium">{details.member.lastName} {details.member.firstName}</dd></div>
        </dl>
        {canAccept ? (
          <InviteLinkDecision token={token} />
        ) : (
          <p role="alert" className="rounded-sm border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            {details.status === "expired" || details.expiresAt <= new Date()
              ? "Срок действия приглашения истёк."
              : details.member.userId
                ? "К этой записи уже подключён аккаунт."
                : details.member.isActive
                  ? "Приглашение уже завершено или отозвано."
                  : "Участник больше не активен в группе."}
          </p>
        )}
        <p className="text-sm text-muted-foreground">Переход по ссылке сам по себе не изменяет состав группы.</p>
      </section>
    </AppShell>
  );
}
