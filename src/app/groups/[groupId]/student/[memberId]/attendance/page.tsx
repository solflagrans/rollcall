import { PageHeader } from "@/features/groups/components/page-header";
import { PeriodSwitcher } from "@/features/groups/components/period-switcher";
import {
  formatCalendarDate,
  formatPeriodName,
} from "@/features/groups/presentation/period-copy";
import { MemberAttendanceList } from "@/features/lessons/components/member-attendance-list";
import { requireStudentAttendanceRouteContext } from "@/features/lessons/server/route-context";
import { formatMemberName } from "@/features/members/presentation/member-copy";

export const dynamic = "force-dynamic";

export default async function StudentAttendancePage({
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
    selectedPeriodStatus,
    attendance,
    sectionPath: attendancePath,
  } = await requireStudentAttendanceRouteContext({
    groupReference: groupId,
    memberReference: memberId,
    periodReference,
    section: "attendance",
  });
  const memberName = formatMemberName(member);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Группа ${group.name}`}
        title="Моя посещаемость"
        description={`${memberName}${member.isActive ? "" : " · Неактивный участник"}`}
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
                `${attendancePath}?period=${encodeURIComponent(period.publicId)}`
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

          <MemberAttendanceList
            key={selectedPeriod.publicId}
            items={attendance.map(({ lesson, discipline, attendance: entry }) => ({
              publicId: lesson.publicId,
              lessonDate: lesson.lessonDate,
              lessonType: lesson.lessonType,
              discipline: {
                publicId: discipline.publicId,
                name: discipline.name,
              },
              status: entry.status,
              comment: entry.comment,
            }))}
            emptyMessage={
              selectedPeriodStatus === "current"
                ? "В текущем периоде пока нет полностью завершённых занятий с участием этого студента."
                : "В выбранном периоде нет полностью завершённых занятий, доступных этому студенту."
            }
          />
        </>
      ) : (
        <div data-surface="subtle" className="rounded-md bg-surface-subtle p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">
            Доступной посещаемости пока нет
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Здесь появятся текущий учебный период или прошлые периоды, в
            которых участник входил в состав занятий.
          </p>
        </div>
      )}
    </div>
  );
}
