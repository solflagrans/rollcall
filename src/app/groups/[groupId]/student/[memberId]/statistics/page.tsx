import { PageHeader } from "@/features/groups/components/page-header";
import { PeriodSwitcher } from "@/features/groups/components/period-switcher";
import {
  formatCalendarDate,
  formatPeriodName,
} from "@/features/groups/presentation/period-copy";
import { MemberAttendanceStatistics } from "@/features/lessons/components/member-attendance-statistics";
import { requireStudentAttendanceRouteContext } from "@/features/lessons/server/route-context";
import { formatMemberName } from "@/features/members/presentation/member-copy";

export const dynamic = "force-dynamic";

export default async function StudentStatisticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string; memberId: string }>;
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const { groupId, memberId } = await params;
  const query = await searchParams;
  const periodReference =
    typeof query.period === "string" ? query.period : undefined;
  const {
    group,
    member,
    availablePeriods,
    selectedPeriod,
    attendance,
    sectionPath: statisticsPath,
  } = await requireStudentAttendanceRouteContext({
    groupReference: groupId,
    memberReference: memberId,
    periodReference,
    section: "statistics",
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Группа ${group.name}`}
        title="Статистика"
        description={`${formatMemberName(member)}${member.isActive ? "" : " · Неактивный участник"}`}
      />

      {selectedPeriod ? (
        <>
          <section className="space-y-3" aria-label="Учебный период">
            <PeriodSwitcher
              groupId={group.publicId}
              periodType={group.periodType}
              periods={availablePeriods}
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

          <MemberAttendanceStatistics
            key={selectedPeriod.publicId}
            items={attendance.map(({ discipline, attendance: entry }) => ({
              discipline: {
                publicId: discipline.publicId,
                name: discipline.name,
              },
              status: entry.status,
            }))}
          />
        </>
      ) : (
        <div data-surface="subtle" className="rounded-md bg-surface-subtle p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">
            Данных для статистики пока недостаточно
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Здесь появятся текущий учебный период или прошлые периоды, в
            которых участник входил в состав занятий. Статистика станет
            доступна после завершения занятий.
          </p>
        </div>
      )}
    </div>
  );
}
