import { redirect } from "next/navigation";

import { FormCard } from "@/features/groups/components/form-card";
import { PageHeader } from "@/features/groups/components/page-header";
import { redirectIfNonCanonical } from "@/features/groups/server/route-context";
import { MemberForm } from "@/features/members/components/member-form";
import { formatMemberName } from "@/features/members/presentation/member-copy";
import { requireMemberRouteContext } from "@/features/members/server/route-context";

export const dynamic = "force-dynamic";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ groupId: string; memberId: string }>;
}) {
  const { groupId, memberId } = await params;
  const context = await requireMemberRouteContext(groupId, memberId);
  const { group, member } = context;

  if (member.role === "headman") {
    redirect(`/groups/${group.publicId}/members?notice=headman-protected`);
  }
  redirectIfNonCanonical(
    [
      { received: groupId, canonical: group.publicId },
      { received: memberId, canonical: member.publicId },
    ],
    `/groups/${group.publicId}/members/${member.publicId}/edit`,
  );
  const memberName = formatMemberName(member);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader eyebrow={`Группа ${group.name}`} title={`Изменить «${memberName}»`} />
      <FormCard label={`Форма редактирования: ${memberName}`}>
        <MemberForm
          mode="edit"
          groupId={group.publicId}
          memberId={member.publicId}
          defaultValues={{
            lastName: member.lastName,
            firstName: member.firstName,
            role: member.role,
          }}
        />
      </FormCard>
    </div>
  );
}
