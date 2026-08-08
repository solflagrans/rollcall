import { DevelopmentViewSwitcher } from "@/features/groups/components/development-view-switcher";
import { GroupSectionNav } from "@/features/groups/components/group-section-nav";
import { getGroupMembersContext } from "@/features/members/server/operations";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const context = await getGroupMembersContext(groupId);
  const canonicalGroupId = context?.group.publicId ?? groupId;

  return (
    <div className="space-y-6">
      <DevelopmentViewSwitcher
        groupId={canonicalGroupId}
        members={(context?.members ?? []).map((member) => ({
          publicId: member.publicId,
          firstName: member.firstName,
          lastName: member.lastName,
          role: member.role,
          isActive: member.isActive,
        }))}
      />
      <GroupSectionNav groupId={canonicalGroupId} />
      {children}
    </div>
  );
}
