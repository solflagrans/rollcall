import { notFound } from "next/navigation";

import { PageHeader } from "@/features/groups/components/page-header";
import { PeriodForm } from "@/features/groups/components/period-form";
import { getAcademicPeriods, getGroup } from "@/features/groups/server/operations";

export const dynamic = "force-dynamic";

export default async function NewPeriodPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const [group, periods] = await Promise.all([getGroup(groupId), getAcademicPeriods(groupId)]);
  if (!group) notFound();

  const firstPeriod = periods.length === 0;
  if (firstPeriod !== (group.periodType === null)) {
    throw new Error("Состояние типа периодов не согласовано с периодами группы.");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow={`Группа ${group.name}`}
        title={firstPeriod ? "Первый учебный период" : "Новый учебный период"}
        description={
          firstPeriod
            ? "Выберите единую систему периодов для группы и укажите календарные даты."
            : "Тип периодов уже определён для этой группы и не изменяется в рамках MVP."
        }
      />
      <section className="rounded-md border bg-card p-5 sm:p-8" aria-label="Форма создания периода">
        <PeriodForm mode="create" groupId={groupId} groupPeriodType={group.periodType} />
      </section>
    </div>
  );
}
