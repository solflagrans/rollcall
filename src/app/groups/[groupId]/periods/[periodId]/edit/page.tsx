import { notFound } from "next/navigation";

import { PageHeader } from "@/features/groups/components/page-header";
import { PeriodForm } from "@/features/groups/components/period-form";
import { formatPeriodName } from "@/features/groups/domain/periods";
import { getAcademicPeriod, getGroup } from "@/features/groups/server/operations";

export const dynamic = "force-dynamic";

export default async function EditPeriodPage({
  params,
}: {
  params: Promise<{ groupId: string; periodId: string }>;
}) {
  const { groupId, periodId } = await params;
  const [group, period] = await Promise.all([
    getGroup(groupId),
    getAcademicPeriod(groupId, periodId),
  ]);
  if (!group || !period || !group.periodType) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow={`Группа ${group.name}`}
        title={`Изменить ${formatPeriodName(group.periodType, period.number)}`}
      />
      <section className="rounded-md border bg-card p-5 sm:p-8" aria-label="Форма редактирования периода">
        <PeriodForm
          mode="edit"
          groupId={groupId}
          periodId={periodId}
          groupPeriodType={group.periodType}
          defaultValues={{
            number: period.number,
            startsOn: period.startsOn,
            endsOn: period.endsOn,
          }}
        />
      </section>
    </div>
  );
}
