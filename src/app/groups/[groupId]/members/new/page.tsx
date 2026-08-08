import { FormCard } from "@/features/groups/components/form-card";
import { PageHeader } from "@/features/groups/components/page-header";
import { redirectIfNonCanonical } from "@/features/groups/server/route-context";
import { MemberForm } from "@/features/members/components/member-form";
import { findHeadman } from "@/features/members/domain/members";
import { requireMembersRouteContext } from "@/features/members/server/route-context";

export const dynamic = "force-dynamic";

export default async function NewMemberPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const context = await requireMembersRouteContext(groupId);
  const { group, members } = context;
  redirectIfNonCanonical(
    [{ received: groupId, canonical: group.publicId }],
    `/groups/${group.publicId}/members/new`,
  );

  const headmanExists = Boolean(findHeadman(members));
  const title = headmanExists ? "Добавить участника" : "Добавить старосту";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow={`Группа ${group.name}`}
        title={title}
        description={
          headmanExists
            ? "Добавьте студента или заместителя в активный состав группы."
            : "Укажите данные старосты. Роль будет назначена автоматически."
        }
      />
      <FormCard label={`Форма: ${title.toLowerCase()}`}>
        <MemberForm
          mode={headmanExists ? "create" : "headman"}
          groupId={group.publicId}
        />
      </FormCard>
    </div>
  );
}
