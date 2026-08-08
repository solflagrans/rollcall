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
import { IndividualAttendanceSummary } from "@/features/lessons/components/individual-attendance-summary";
import { getPeriodJournal } from "@/features/lessons/server/operations";
import { getUserToday } from "@/features/preferences/server/user-time-zone";

export const dynamic = "force-dynamic";

export default async function GroupSummaryPage({
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
  const summaryPath = `/groups/${group.publicId}/summary`;
  const requestedPeriod = periodReference
    ? periods.find(
        (period) =>
          period.id === periodReference || period.publicId === periodReference,
      )
    : undefined;

  if (periodReference && !requestedPeriod) redirect(summaryPath);

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
    `${summaryPath}${canonicalPeriodQuery}`,
  );

  const journal = selectedPeriod
    ? await getPeriodJournal(group.id, selectedPeriod.id)
    : undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Группа ${group.name}`}
        title="Сводная"
        description="Индивидуальные показатели посещаемости участников"
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
                `${summaryPath}?period=${encodeURIComponent(period.publicId)}`
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

          <IndividualAttendanceSummary
            key={selectedPeriod.publicId}
            lessons={journal.lessons.map((lesson) => ({
              publicId: lesson.publicId,
              discipline: {
                publicId: lesson.discipline.publicId,
                name: lesson.discipline.name,
              },
              attendance: lesson.attendance.map(({ attendance, member }) => ({
                groupMemberId: member.publicId,
                status: attendance.status,
              })),
            }))}
            members={journal.members.map((member) => ({
              publicId: member.publicId,
              firstName: member.firstName,
              lastName: member.lastName,
              isActive: member.isActive,
            }))}
          />
        </>
      ) : (
        <div className="rounded-md border border-dashed bg-surface-subtle p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">
            Данных для сводной пока нет
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Сводная появится после создания учебного периода и полного
            заполнения посещаемости хотя бы одного занятия.
          </p>
        </div>
      )}
    </div>
  );
}
