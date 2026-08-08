import { PageHeader } from "@/features/groups/components/page-header";
import { PeriodForm } from "@/features/groups/components/period-form";
import { formatPeriodName } from "@/features/groups/presentation/period-copy";
import { toPeriodSummary } from "@/features/groups/presentation/period-view-model";
import {
  redirectIfNonCanonical,
  requireGroupPeriodRouteContext,
} from "@/features/groups/server/route-context";

export const dynamic = "force-dynamic";

export default async function EditPeriodPage({
  params,
}: {
  params: Promise<{ groupId: string; periodId: string }>;
}) {
  const { groupId, periodId } = await params;
  const context = await requireGroupPeriodRouteContext(groupId, periodId);
  const { group, period, periods } = context;

  redirectIfNonCanonical(
    [
      { received: groupId, canonical: group.publicId },
      { received: periodId, canonical: period.publicId },
    ],
    `/groups/${group.publicId}/periods/${period.publicId}/edit`,
  );
  const periodName = formatPeriodName(group.periodType, period.number);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow={`Группа ${group.name}`}
        title={`Изменить «${periodName}»`}
      />
      <FormCard label={`Форма редактирования: ${periodName}`}>
        <PeriodForm
          mode="edit"
          groupId={group.publicId}
          periodId={period.publicId}
          groupPeriodType={group.periodType}
          periods={periods
            .filter((candidate) => candidate.id !== period.id)
            .map(toPeriodSummary)}
          defaultValues={{
            number: period.number,
            startsOn: period.startsOn,
            endsOn: period.endsOn,
          }}
        />
      </FormCard>
    </div>
  );
}
import { FormCard } from "@/features/groups/components/form-card";
