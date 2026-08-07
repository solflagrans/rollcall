import { CalendarDays, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/features/groups/components/page-header";
import { PeriodSwitcher } from "@/features/groups/components/period-switcher";
import { StatusBadge } from "@/features/groups/components/status-badge";
import { SuccessNotice } from "@/features/groups/components/success-notice";
import {
  formatCalendarDate,
  formatPeriodName,
  getPeriodStatus,
  getTodayDate,
} from "@/features/groups/domain/periods";
import {
  getAcademicPeriod,
  getAcademicPeriods,
  getGroup,
} from "@/features/groups/server/operations";

export const dynamic = "force-dynamic";

export default async function AcademicPeriodPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string; periodId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { groupId, periodId } = await params;
  const [{ notice }, group, period, periods] = await Promise.all([
    searchParams,
    getGroup(groupId),
    getAcademicPeriod(groupId, periodId),
    getAcademicPeriods(groupId),
  ]);
  if (!group || !period || !group.periodType) notFound();

  const periodName = formatPeriodName(group.periodType, period.number);
  const status = getPeriodStatus(period.startsOn, period.endsOn, getTodayDate());

  return (
    <div className="space-y-8">
      <SuccessNotice notice={notice} />
      <PageHeader
        eyebrow={`Группа ${group.name}`}
        title={periodName}
        description={`${formatCalendarDate(period.startsOn)} — ${formatCalendarDate(period.endsOn)}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/groups/${groupId}/edit?periodId=${periodId}`}>
                <Pencil aria-hidden="true" />
                Изменить группу
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/groups/${groupId}/periods/${periodId}/edit`}>
                <Pencil aria-hidden="true" />
                Изменить период
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <StatusBadge status={status} />
        <Button asChild variant="ghost" className="hidden sm:inline-flex">
          <Link href={`/groups/${groupId}/periods/new`}>
            <Plus aria-hidden="true" />
            Добавить период
          </Link>
        </Button>
      </div>

      <PeriodSwitcher
        groupId={groupId}
        periodType={group.periodType}
        periods={periods}
        selectedPeriodId={periodId}
      />

      <section className="rounded-md border border-dashed bg-surface-subtle p-6 sm:p-10">
        <CalendarDays aria-hidden="true" className="size-8 text-muted-foreground" />
        <h2 className="mt-4 font-heading text-xl font-semibold">Данные периода появятся позже</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          На следующих этапах здесь появятся дисциплины, занятия и журнал посещаемости.
        </p>
      </section>
    </div>
  );
}
