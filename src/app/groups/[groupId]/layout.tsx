import { GroupSectionNav } from "@/features/groups/components/group-section-nav";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  return (
    <div className="space-y-6">
      <GroupSectionNav groupId={groupId} />
      {children}
    </div>
  );
}
