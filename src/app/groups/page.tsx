import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { getMembershipHome } from "@/features/auth/domain/models";
import { requireAppRouteContext } from "@/features/auth/server/route-context";
import { memberRoleLabels } from "@/features/members/presentation/member-copy";
import { IncomingInvitations } from "@/features/invitations/components/incoming-invitations";
import { listIncomingInvitations } from "@/features/invitations/server/operations";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const [{ memberships }, invitations] = await Promise.all([
    requireAppRouteContext(),
    listIncomingInvitations(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">Учебные группы</p>
        <h1 className="font-heading text-3xl font-semibold">Мои группы</h1>
        <p className="text-muted-foreground">
          Выберите группу, чтобы перейти к доступному разделу.
        </p>
      </header>

      <IncomingInvitations invitations={invitations} />

      {memberships.length > 0 ? (
        <ul className="divide-y overflow-hidden rounded-md border bg-card" aria-label="Доступные группы">
          {memberships.map((membership) => (
            <li key={membership.member.id}>
              <Link
                href={getMembershipHome(membership)}
                className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium" title={membership.group.name}>
                    {membership.group.name}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {memberRoleLabels[membership.member.role]}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <section className="rounded-md border border-dashed bg-card p-6 text-center sm:p-8">
          <h2 className="font-heading text-2xl font-semibold">У вас пока нет групп</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Попросите старосту добавить вас в группу или создайте собственную.
          </p>
        </section>
      )}
    </div>
  );
}
