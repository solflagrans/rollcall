import { DevelopmentViewSwitcher } from "@/features/groups/components/development-view-switcher";
import { GroupSectionNav } from "@/features/groups/components/group-section-nav";
import { isManagerialRole } from "@/features/auth/domain/models";
import { requireGroupRouteAccess } from "@/features/auth/server/route-context";
import {
  getGroupMembersContext,
  getOwnGroupMember,
} from "@/features/members/server/operations";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { membership } = await requireGroupRouteAccess(groupId);
  const canonicalGroupId = membership.group.publicId;
  const members =
    process.env.NODE_ENV !== "production"
      ? isManagerialRole(membership.member.role)
        ? (await getGroupMembersContext(groupId))?.members ?? []
        : [await getOwnGroupMember(groupId, membership.member.publicId)].flatMap(
            (member) => (member ? [member] : []),
          )
      : [];

  return (
    <div className="space-y-6">
      {process.env.NODE_ENV !== "production" ? (
        <DevelopmentViewSwitcher
          groupId={canonicalGroupId}
          members={members.map((member) => ({
            publicId: member.publicId,
            firstName: member.firstName,
            lastName: member.lastName,
            role: member.role,
            isActive: member.isActive,
          }))}
        />
      ) : null}
      <GroupSectionNav groupId={canonicalGroupId} />
      {children}
    </div>
  );
}
