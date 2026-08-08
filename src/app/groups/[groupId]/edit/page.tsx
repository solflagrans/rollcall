import { redirect } from "next/navigation";

import { FormCard } from "@/features/groups/components/form-card";
import { GroupForm } from "@/features/groups/components/group-form";
import { PageHeader } from "@/features/groups/components/page-header";
import {
  redirectIfNonCanonical,
  requireGroupRouteContext,
} from "@/features/groups/server/route-context";

export const dynamic = "force-dynamic";

export default async function EditGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ periodId?: string }>;
}) {
  const { groupId } = await params;
  const { periodId } = await searchParams;
  const context = await requireGroupRouteContext(groupId);
  const { group, periods } = context;

  const returnPeriod = periodId
    ? periods.find(
        (period) => period.id === periodId || period.publicId === periodId,
      )
    : undefined;
  if (periodId && !returnPeriod) {
    redirect(`/groups/${group.publicId}?notice=period-not-found`);
  }
  const periodQuery = returnPeriod ? `?periodId=${returnPeriod.publicId}` : "";
  redirectIfNonCanonical(
    [
      { received: groupId, canonical: group.publicId },
      ...(periodId && returnPeriod
        ? [{ received: periodId, canonical: returnPeriod.publicId }]
        : []),
    ],
    `/groups/${group.publicId}/edit${periodQuery}`,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader eyebrow="Настройки группы" title={`Изменить группу ${group.name}`} />
      <FormCard label="Форма редактирования группы">
        <GroupForm
          mode="edit"
          groupId={group.publicId}
          defaultName={group.name}
          defaultPeriodType={group.periodType}
          returnPeriodId={returnPeriod?.publicId}
        />
      </FormCard>
    </div>
  );
}
