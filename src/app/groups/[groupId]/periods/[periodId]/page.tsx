import { DisciplineNotice } from "@/features/disciplines/components/discipline-notice";
import { PeriodDisciplinesSection } from "@/features/disciplines/components/period-disciplines-section";
import { getPeriodDisciplinesData } from "@/features/disciplines/server/operations";
import { NewPeriodAction } from "@/features/groups/components/new-period-action";
import { PageHeader } from "@/features/groups/components/page-header";
import { PeriodActionsMenu } from "@/features/groups/components/period-actions-menu";
import { PeriodSwitcher } from "@/features/groups/components/period-switcher";
import { StatusBadge } from "@/features/groups/components/status-badge";
import { SuccessNotice } from "@/features/groups/components/success-notice";
import { PeriodLessonsSection } from "@/features/lessons/components/period-lessons-section";
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
  const disciplineData = await getPeriodDisciplinesData(group.id, period.id);

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
        <div>
          <NewPeriodAction groupId={group.publicId} periodType={group.periodType} />
        </div>
      </div>

      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <PeriodSwitcher
            groupId={group.publicId}
            periodType={group.periodType}
            periods={periods}
            selectedPeriodId={period.publicId}
          />
        </div>
        <PeriodActionsMenu
          groupId={group.publicId}
          periodId={period.publicId}
          periodType={group.periodType}
          periodNumber={period.number}
        />
      </div>

      <PeriodDisciplinesSection
        groupId={group.publicId}
        periodId={period.publicId}
        disciplines={disciplineData.disciplines}
        assignedDisciplines={disciplineData.assignedDisciplines}
        openOnLoad={addDisciplines === "1"}
      />

      <PeriodLessonsSection
        groupId={group.publicId}
        periodId={period.publicId}
        hasDisciplines={disciplineData.assignedDisciplines.length > 0}
      />
    </div>
  );
}
