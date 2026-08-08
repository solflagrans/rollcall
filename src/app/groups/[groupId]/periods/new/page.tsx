import { PageHeader } from "@/features/groups/components/page-header";
import { PeriodForm } from "@/features/groups/components/period-form";
import { periodTypeCopy } from "@/features/groups/presentation/period-copy";
import { toPeriodSummary } from "@/features/groups/presentation/period-view-model";
import {
  redirectIfNonCanonical,
  requireGroupRouteContext,
} from "@/features/groups/server/route-context";

export const dynamic = "force-dynamic";

export default async function NewPeriodPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const context = await requireGroupRouteContext(groupId);
  const { group, periods } = context;
  redirectIfNonCanonical(
    [{ received: groupId, canonical: group.publicId }],
    `/groups/${group.publicId}/periods/new`,
  );
  const copy = periodTypeCopy[group.periodType];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow={`Группа ${group.name}`}
        title={copy.newAction}
        description={`Укажите номер и календарные даты. Для этой группы используются ${copy.plural.toLowerCase()}.`}
      />
      <FormCard label={`Форма: ${copy.newAction.toLowerCase()}`}>
        <PeriodForm
          mode="create"
          groupId={group.publicId}
          groupPeriodType={group.periodType}
          periods={periods.map(toPeriodSummary)}
        />
      </FormCard>
    </div>
  );
}
import { FormCard } from "@/features/groups/components/form-card";
