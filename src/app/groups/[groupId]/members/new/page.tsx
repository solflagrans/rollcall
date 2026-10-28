import { FormCard } from "@/features/groups/components/form-card";
import { BackLink } from "@/features/groups/components/back-link";
import { PageHeader } from "@/features/groups/components/page-header";
import { redirectIfNonCanonical } from "@/features/groups/server/route-context";
import { MemberForm } from "@/features/members/components/member-form";
import { requireMembersRouteContext } from "@/features/members/server/route-context";

export const dynamic = "force-dynamic";

export default async function NewMemberPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const context = await requireMembersRouteContext(groupId);
  const { group } = context;
  redirectIfNonCanonical(
    [{ received: groupId, canonical: group.publicId }],
    `/groups/${group.publicId}/members/new`,
  );

  const title = "Добавить участника";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow={`Группа ${group.name}`}
        title={title}
        description="Добавьте студента или заместителя в активный состав группы."
        actions={
          <BackLink
            href={`/groups/${group.publicId}/members`}
            label="К составу"
          />
        }
      />
      <FormCard label={`Форма: ${title.toLowerCase()}`}>
        <MemberForm mode="create" groupId={group.publicId} />
      </FormCard>
    </div>
  );
}
