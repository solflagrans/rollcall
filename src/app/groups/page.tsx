import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { LinkPendingIndicator } from "@/components/link-pending-indicator";
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
        <h1 className="font-heading text-3xl font-semibold">Мои группы</h1>
        <p className="text-muted-foreground">
          Выберите группу, чтобы перейти к доступному разделу.
        </p>
      </header>

      <IncomingInvitations invitations={invitations} />

      {memberships.length > 0 ? (
        <ul
          data-surface="raised"
          className="divide-y overflow-hidden rounded-md border bg-card shadow-xs"
          aria-label="Доступные группы"
        >
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
                <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                  <LinkPendingIndicator />
                  <ChevronRight aria-hidden="true" className="size-5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <section
          data-surface="subtle"
          className="rounded-md bg-surface-subtle p-6 text-center sm:p-8"
        >
          <h2 className="font-heading text-2xl font-semibold">У вас пока нет групп</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Попросите старосту добавить вас в группу или создайте собственную.
          </p>
        </section>
      )}
    </div>
  );
}
