import { DisciplineNotice } from "@/features/disciplines/components/discipline-notice";
import { PeriodDisciplinesSection } from "@/features/disciplines/components/period-disciplines-section";
import { getPeriodDisciplinesData } from "@/features/disciplines/server/operations";
import { NewPeriodAction } from "@/features/groups/components/new-period-action";
import { PageHeader } from "@/features/groups/components/page-header";
import { PeriodActionsMenu } from "@/features/groups/components/period-actions-menu";
import { PeriodSwitcher } from "@/features/groups/components/period-switcher";
import { StatusBadge } from "@/features/groups/components/status-badge";
import { SuccessNotice } from "@/features/groups/components/success-notice";
import { PeriodJournal } from "@/features/lessons/components/period-journal";
import { getPeriodJournal } from "@/features/lessons/server/operations";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import {
  getPeriodStatus,
} from "@/features/groups/domain/periods";
import {
  formatCalendarDate,
  formatPeriodName,
} from "@/features/groups/presentation/period-copy";
import {
  redirectIfNonCanonical,
  requireGroupPeriodRouteContext,
} from "@/features/groups/server/route-context";
import { getUserToday } from "@/features/preferences/server/user-time-zone";

export const dynamic = "force-dynamic";

export default async function AcademicPeriodPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string; periodId: string }>;
  searchParams: Promise<{ notice?: string; "add-disciplines"?: string }>;
}) {
  const { groupId, periodId } = await params;
  const { notice, "add-disciplines": addDisciplines } = await searchParams;
  const context = await requireGroupPeriodRouteContext(groupId, periodId);
  const { group, period, periods } = context;

  const canonicalSearch = new URLSearchParams();
  if (notice) canonicalSearch.set("notice", notice);
  if (addDisciplines === "1") canonicalSearch.set("add-disciplines", "1");
  const query = canonicalSearch.size > 0 ? `?${canonicalSearch.toString()}` : "";
  redirectIfNonCanonical(
    [
      { received: groupId, canonical: group.publicId },
      { received: periodId, canonical: period.publicId },
    ],
    `/groups/${group.publicId}/periods/${period.publicId}${query}`,
  );
  const periodName = formatPeriodName(group.periodType, period.number);
  const status = getPeriodStatus(period.startsOn, period.endsOn, await getUserToday());
  const [disciplineData, journal] = await Promise.all([
    getPeriodDisciplinesData(group.id, period.id),
    getPeriodJournal(group.id, period.id),
  ]);
  const periodHref = `/groups/${group.publicId}/periods/${period.publicId}`;

  return (
    <div className="space-y-8">
      <SuccessNotice notice={notice} periodType={group.periodType} />
      <DisciplineNotice notice={notice} />
      <PageHeader
        eyebrow={`Группа ${group.name}`}
        title={periodName}
        description={`${formatCalendarDate(period.startsOn)} — ${formatCalendarDate(period.endsOn)}`}
      />

      <div className="flex items-center justify-between gap-4">
        <StatusBadge status={status} />
        {disciplineData.assignedDisciplines.length > 0 ? (
          <Button asChild size="lg">
            <Link href={`${periodHref}/lessons/new`}>
              <Plus aria-hidden="true" />
              Новое занятие
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0 flex-1">
          <PeriodSwitcher
            groupId={group.publicId}
            periodType={group.periodType}
            periods={periods}
            selectedPeriodId={period.publicId}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <NewPeriodAction
            groupId={group.publicId}
            periodType={group.periodType}
            secondary
            returnPeriodId={period.publicId}
          />
          <PeriodActionsMenu
            groupId={group.publicId}
            periodId={period.publicId}
            periodType={group.periodType}
            periodNumber={period.number}
          />
        </div>
      </div>

      {disciplineData.assignedDisciplines.length === 0 ? (
        <PeriodDisciplinesSection
          groupId={group.publicId}
          periodId={period.publicId}
          disciplines={disciplineData.disciplines}
          assignedDisciplines={disciplineData.assignedDisciplines}
          openOnLoad={addDisciplines === "1"}
        />
      ) : (
        <PeriodJournal
          groupId={group.publicId}
          periodId={period.publicId}
          disciplines={disciplineData.assignedDisciplines}
          lessons={journal.lessons.map((lesson) => ({
            publicId: lesson.publicId,
            lessonDate: lesson.lessonDate,
            lessonType: lesson.lessonType,
            discipline: {
              publicId: lesson.discipline.publicId,
              name: lesson.discipline.name,
              isArchived: lesson.discipline.isArchived,
            },
            attendance: lesson.attendance.map(({ attendance, member }) => ({
              groupMemberId: member.publicId,
              status: attendance.status,
              comment: attendance.comment,
            })),
          }))}
          members={journal.members.map((member) => ({
            publicId: member.publicId,
            firstName: member.firstName,
            lastName: member.lastName,
            isActive: member.isActive,
          }))}
          disciplineSettings={
            <PeriodDisciplinesSection
              groupId={group.publicId}
              periodId={period.publicId}
              disciplines={disciplineData.disciplines}
              assignedDisciplines={disciplineData.assignedDisciplines}
              openOnLoad={addDisciplines === "1"}
              compact
            />
          }
        />
      )}
    </div>
  );
}
