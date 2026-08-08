import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getMembershipHome } from "@/features/auth/domain/models";
import { requireAppRouteContext } from "@/features/auth/server/route-context";
import { AppShell } from "@/features/groups/components/app-shell";

export const dynamic = "force-dynamic";

export default async function Home() {
  const context = await requireAppRouteContext();
  const currentGroup = (await cookies()).get("rollcall.current-group")?.value;
  const selected =
    context.memberships.find(({ group }) => group.publicId === currentGroup) ??
    context.memberships[0];
  if (selected) redirect(getMembershipHome(selected));

  return (
    <AppShell viewer={context}>
      <div className="mx-auto max-w-2xl py-8">
        <section className="rounded-md border border-dashed bg-card p-6 text-center sm:p-8">
          <h1 className="font-heading text-2xl font-semibold">У вас пока нет групп</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Попросите старосту добавить вас в группу или создайте собственную.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
