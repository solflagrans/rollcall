import { requireAppRouteContext } from "@/features/auth/server/route-context";
import { AppShell } from "@/features/groups/components/app-shell";
import { PageHeader } from "@/features/groups/components/page-header";
import { ProfileSettings } from "@/features/profile/components/profile-settings";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const context = await requireAppRouteContext();

  return (
    <AppShell viewer={context}>
      <div className="mx-auto max-w-3xl space-y-8">
        <PageHeader
          eyebrow="Аккаунт"
          title="Профиль"
          description="Личные данные и безопасность вашего аккаунта Rollcall."
        />
        <ProfileSettings profile={context.profile} email={context.user.email} />
      </div>
    </AppShell>
  );
}
