import { redirect } from "next/navigation";

import { PageHeader } from "@/features/groups/components/page-header";
import { PeriodSwitcher } from "@/features/groups/components/period-switcher";
import { getPeriodStatus } from "@/features/groups/domain/periods";
import {
  formatCalendarDate,
  formatPeriodName,
} from "@/features/groups/presentation/period-copy";
import { redirectIfNonCanonical } from "@/features/groups/server/route-context";
import { MemberAttendanceList } from "@/features/lessons/components/member-attendance-list";
import { getMemberAttendancePeriodSelection } from "@/features/lessons/domain/member-attendance";
import {
  getCompletedMemberAttendance,
  getMemberAttendancePeriodIds,
} from "@/features/lessons/server/operations";
import { formatMemberName } from "@/features/members/presentation/member-copy";
import { requireStudentMemberRouteContext } from "@/features/members/server/route-context";
import { getUserToday } from "@/features/preferences/server/user-time-zone";

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
  const { group, periods, member } = await requireStudentMemberRouteContext(
    groupId,
    memberId,
  );
  const [today, attendancePeriodIds] = await Promise.all([
    getUserToday(),
    getMemberAttendancePeriodIds(member.id),
  ]);
  const { availablePeriods, defaultPeriod } =
    getMemberAttendancePeriodSelection(
      periods,
      new Set(attendancePeriodIds),
      member.isActive,
      today,
    );
  const requestedPeriod = periodReference
    ? availablePeriods.find(
        (period) =>
          period.id === periodReference || period.publicId === periodReference,
      )
    : undefined;
  const selectedPeriod = requestedPeriod ?? defaultPeriod;
  const attendancePath = `/groups/${group.publicId}/student/${member.publicId}/attendance`;

  if (periodReference && !requestedPeriod) redirect(attendancePath);

  const canonicalPeriodQuery = requestedPeriod
    ? `?period=${encodeURIComponent(requestedPeriod.publicId)}`
    : "";
  redirectIfNonCanonical(
    [
      { received: groupId, canonical: group.publicId },
      { received: memberId, canonical: member.publicId },
      ...(periodReference && requestedPeriod
        ? [{ received: periodReference, canonical: requestedPeriod.publicId }]
        : []),
    ],
    `${attendancePath}${canonicalPeriodQuery}`,
  );

  const attendance = selectedPeriod
    ? await getCompletedMemberAttendance(selectedPeriod.id, member.id)
    : [];
  const memberName = formatMemberName(member);
  const selectedPeriodStatus = selectedPeriod
    ? getPeriodStatus(selectedPeriod.startsOn, selectedPeriod.endsOn, today)
    : undefined;

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
        <div className="rounded-md border border-dashed bg-surface-subtle p-5 sm:p-6">
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
