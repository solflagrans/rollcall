import { redirect } from "next/navigation";

import { PageHeader } from "@/features/groups/components/page-header";
import { PeriodSwitcher } from "@/features/groups/components/period-switcher";
import { selectDefaultPeriod } from "@/features/groups/domain/periods";
import {
  formatCalendarDate,
  formatPeriodName,
} from "@/features/groups/presentation/period-copy";
import {
  redirectIfNonCanonical,
  requireGroupRouteContext,
} from "@/features/groups/server/route-context";
import { GroupAttendanceStatistics } from "@/features/lessons/components/group-attendance-statistics";
import { getPeriodJournal } from "@/features/lessons/server/operations";
import { getUserToday } from "@/features/preferences/server/user-time-zone";

export const dynamic = "force-dynamic";

export default async function GroupStatisticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const { groupId } = await params;
  const query = await searchParams;
  const periodReference =
    typeof query.period === "string" ? query.period : undefined;
  const { group, periods } = await requireGroupRouteContext(groupId);
  const statisticsPath = `/groups/${group.publicId}/statistics`;
  const requestedPeriod = periodReference
    ? periods.find(
        (period) =>
          period.id === periodReference || period.publicId === periodReference,
      )
    : undefined;

  if (periodReference && !requestedPeriod) redirect(statisticsPath);

  const selectedPeriod =
    requestedPeriod ?? selectDefaultPeriod(periods, await getUserToday());
  const canonicalPeriodQuery = requestedPeriod
    ? `?period=${encodeURIComponent(requestedPeriod.publicId)}`
    : "";
  redirectIfNonCanonical(
    [
      { received: groupId, canonical: group.publicId },
      ...(periodReference && requestedPeriod
        ? [{ received: periodReference, canonical: requestedPeriod.publicId }]
        : []),
    ],
    `${statisticsPath}${canonicalPeriodQuery}`,
  );

  const journal = selectedPeriod
    ? await getPeriodJournal(group.id, selectedPeriod.id)
    : undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Группа ${group.name}`}
        title="Статистика"
        description="Аналитика посещаемости группы"
      />

      {selectedPeriod && journal ? (
        <>
          <section className="space-y-3" aria-label="Учебный период">
            <PeriodSwitcher
              groupId={group.publicId}
              periodType={group.periodType}
              periods={periods}
              selectedPeriodId={selectedPeriod.publicId}
              getPeriodHref={(period) =>
                `${statisticsPath}?period=${encodeURIComponent(period.publicId)}`
              }
            />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-heading font-semibold">
                {formatPeriodName(group.periodType, selectedPeriod.number)}
              </h2>
              <p className="text-sm text-muted-foreground">
                {formatCalendarDate(selectedPeriod.startsOn)} —{" "}
                {formatCalendarDate(selectedPeriod.endsOn)}
              </p>
            </div>
          </section>

          <GroupAttendanceStatistics
            key={selectedPeriod.publicId}
            lessons={journal.lessons.map((lesson) => ({
              publicId: lesson.publicId,
              discipline: {
                publicId: lesson.discipline.publicId,
                name: lesson.discipline.name,
              },
              attendance: lesson.attendance.map(({ attendance }) => ({
                status: attendance.status,
              })),
            }))}
          />
        </>
      ) : (
        <div className="rounded-md border border-dashed bg-surface-subtle p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">
            Данных для статистики пока недостаточно
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Статистика появится после создания учебного периода и завершения
            занятий.
          </p>
        </div>
      )}
    </div>
  );
}
