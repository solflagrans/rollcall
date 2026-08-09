import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";

import { MemberActionsMenu } from "@/features/members/components/member-actions-menu";
import { MemberInvitationControls } from "@/features/invitations/components/member-invitation-controls";
import { MemberRoleBadge } from "@/features/members/components/member-role-badge";
import type {
  GroupMemberListItem,
  MemberListStatus,
  MemberSortKey,
  SortDirection,
} from "@/features/members/domain/members";
import { sortMembers } from "@/features/members/domain/sorting";
import {
  formatMemberName,
  memberListLabels,
} from "@/features/members/presentation/member-copy";
import { cn } from "@/lib/utils";

export function MemberRoster({
  groupId,
  members,
  status,
  sort,
  direction,
}: {
  groupId: string;
  members: GroupMemberListItem[];
  status: MemberListStatus;
  sort: MemberSortKey;
  direction: SortDirection;
}) {
  const activeCount = members.filter((member) => member.isActive).length;
  const inactiveCount = members.length - activeCount;
  const visibleMembers = sortMembers(
    members.filter((member) => member.isActive === (status === "active")),
    sort,
    direction,
  );

  return (
    <section className="space-y-5" aria-label="Состав группы">
      <nav aria-label="Статус участников" className="flex gap-2">
        {(["active", "inactive"] as const).map((item) => {
          const selected = item === status;
          const count = item === "active" ? activeCount : inactiveCount;
          return (
            <Link
              key={item}
              href={membersHref(groupId, { status: item, sort, direction })}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 items-center rounded-sm border px-3 text-sm font-medium transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                selected
                  ? "border-primary bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {memberListLabels[item]} · {count}
            </Link>
          );
        })}
      </nav>

      {visibleMembers.length === 0 ? (
        <div className="rounded-md border border-dashed bg-surface-subtle p-6 text-sm text-muted-foreground">
          {status === "inactive"
            ? "Неактивных участников пока нет."
            : "Активных участников пока нет."}
        </div>
      ) : (
        <>
          <div className="hidden overflow-visible rounded-md border bg-card md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <SortableHeader
                    groupId={groupId}
                    label="Участник"
                    column="lastName"
                    status={status}
                    sort={sort}
                    direction={direction}
                  />
                  <SortableHeader
                    groupId={groupId}
                    label="Роль"
                    column="role"
                    status={status}
                    sort={sort}
                    direction={direction}
                  />
                  <th scope="col" className="px-4 py-3 font-medium">Подключение аккаунта</th>
                  <th scope="col" className="w-16 px-4 py-3">
                    <span className="sr-only">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleMembers.map((member) => (
                  <tr key={member.publicId} className="border-b last:border-b-0">
                    <td className="h-16 px-4 py-3 font-medium">{formatMemberName(member)}</td>
                    <td className="h-16 px-4 py-3">
                      <MemberRoleBadge role={member.role} />
                    </td>
                    <td className="min-w-64 px-4 py-3">
                      <MemberInvitationControls
                        groupId={groupId}
                        member={{
                          publicId: member.publicId,
                          firstName: member.firstName,
                          lastName: member.lastName,
                          isActive: member.isActive,
                          isConnected: Boolean(member.userId),
                          connectedProfile: member.connectedProfile,
                          pendingInvitations: member.pendingInvitations,
                        }}
                      />
                    </td>
                    <td className="h-16 px-4 py-3 text-right">
                      <MemberActionsMenu
                        groupId={groupId}
                        member={{
                          publicId: member.publicId,
                          firstName: member.firstName,
                          lastName: member.lastName,
                          role: member.role,
                          isActive: member.isActive,
                          canDelete: !member.userId && !member.hasJournalRecords,
                        }}
                        compact
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {visibleMembers.map((member) => (
              <article
                key={member.publicId}
                className="flex items-center gap-3 rounded-md border bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{formatMemberName(member)}</p>
                  <div className="mt-2">
                    <MemberRoleBadge role={member.role} />
                  </div>
                  <div className="mt-3">
                    <MemberInvitationControls
                      groupId={groupId}
                      member={{
                        publicId: member.publicId,
                        firstName: member.firstName,
                        lastName: member.lastName,
                        isActive: member.isActive,
                        isConnected: Boolean(member.userId),
                        connectedProfile: member.connectedProfile,
                        pendingInvitations: member.pendingInvitations,
                      }}
                    />
                  </div>
                </div>
                <MemberActionsMenu
                  groupId={groupId}
                  member={{
                    publicId: member.publicId,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    role: member.role,
                    isActive: member.isActive,
                    canDelete: !member.userId && !member.hasJournalRecords,
                  }}
                />
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function SortableHeader({
  groupId,
  label,
  column,
  status,
  sort,
  direction,
}: {
  groupId: string;
  label: string;
  column: MemberSortKey;
  status: MemberListStatus;
  sort: MemberSortKey;
  direction: SortDirection;
}) {
  const selected = sort === column;
  const nextDirection = selected && direction === "asc" ? "desc" : "asc";
  const Icon = !selected ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <th scope="col" className="px-4 py-3 font-medium">
      <Link
        href={membersHref(groupId, {
          status,
          sort: column,
          direction: nextDirection,
        })}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {label}
        <Icon aria-hidden="true" className="size-3.5" />
      </Link>
    </th>
  );
}

function membersHref(
  groupId: string,
  options: {
    status: MemberListStatus;
    sort: MemberSortKey;
    direction: SortDirection;
  },
) {
  const search = new URLSearchParams(options);
  return `/groups/${groupId}/members?${search.toString()}`;
}
