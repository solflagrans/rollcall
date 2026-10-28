import { redirect } from "next/navigation";

import { FormCard } from "@/features/groups/components/form-card";
import { BackLink } from "@/features/groups/components/back-link";
import { PageHeader } from "@/features/groups/components/page-header";
import { redirectIfNonCanonical } from "@/features/groups/server/route-context";
import { MemberForm } from "@/features/members/components/member-form";
import { formatMemberName } from "@/features/members/presentation/member-copy";
import { requireMemberRouteContext } from "@/features/members/server/route-context";

export const dynamic = "force-dynamic";

export default async function EditMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string; memberId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { groupId, memberId } = await params;
  const { returnTo: requestedReturnTo } = await searchParams;
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
  const membersPath = `/groups/${group.publicId}/members`;
  const fallbackReturnTo = `${membersPath}${member.isActive ? "" : "?status=inactive"}`;
  let returnTo = fallbackReturnTo;
  if (requestedReturnTo) {
    const candidate = new URL(requestedReturnTo, "http://rollcall.local");
    if (candidate.origin === "http://rollcall.local" && candidate.pathname === membersPath) {
      returnTo = `${candidate.pathname}${candidate.search}`;
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow={`Группа ${group.name}`}
        title={`Изменить «${memberName}»`}
        actions={
          <BackLink
            href={returnTo}
            label="К составу"
          />
        }
      />
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
          returnTo={returnTo}
        />
      </FormCard>
    </div>
  );
}
