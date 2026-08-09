import { GroupSectionNav } from "@/features/groups/components/group-section-nav";
import { requireGroupRouteAccess } from "@/features/auth/server/route-context";

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

  return (
    <div className="space-y-6">
      <GroupSectionNav groupId={canonicalGroupId} />
      {children}
    </div>
  );
}
