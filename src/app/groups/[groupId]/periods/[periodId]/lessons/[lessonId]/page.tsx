import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FormCard } from "@/features/groups/components/form-card";
import { PageHeader } from "@/features/groups/components/page-header";
import { SuccessNotice } from "@/features/groups/components/success-notice";
import { getPeriodStatus } from "@/features/groups/domain/periods";
import {
  formatCalendarDate,
  formatPeriodName,
} from "@/features/groups/presentation/period-copy";
import { redirectIfNonCanonical } from "@/features/groups/server/route-context";
import { LessonActions } from "@/features/lessons/components/lesson-actions";
import { LessonForm } from "@/features/lessons/components/lesson-form";
import { isLessonCompleted } from "@/features/lessons/domain/lessons";
import { lessonTypeCopy } from "@/features/lessons/presentation/lesson-copy";
import { requireLessonRouteContext } from "@/features/lessons/server/route-context";
import { getUserToday } from "@/features/preferences/server/user-time-zone";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string; periodId: string; lessonId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { groupId, periodId, lessonId } = await params;
  const { notice } = await searchParams;
  const context = await requireLessonRouteContext(groupId, periodId, lessonId);
  const { group, period, lesson, attendance, disciplines } = context;
  const canonicalPath = `/groups/${group.publicId}/periods/${period.publicId}/lessons/${lesson.publicId}${notice ? `?notice=${encodeURIComponent(notice)}` : ""}`;
  redirectIfNonCanonical(
    [
      { received: groupId, canonical: group.publicId },
      { received: periodId, canonical: period.publicId },
      { received: lessonId, canonical: lesson.publicId },
    ],
    canonicalPath,
  );

  const completed = isLessonCompleted(
    attendance.map(({ attendance: entry }) => entry),
  );
  const periodCompleted =
    getPeriodStatus(period.startsOn, period.endsOn, await getUserToday()) ===
    "completed";
  const periodName = formatPeriodName(group.periodType, period.number);
  const periodHref = `/groups/${group.publicId}/periods/${period.publicId}`;
  const editableDisciplines = disciplines.filter(
    (discipline) =>
      !discipline.isArchived || discipline.id === lesson.discipline.id,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <SuccessNotice notice={notice} periodType={group.periodType} />
      <PageHeader
        eyebrow={`Группа ${group.name} · ${periodName}`}
        title={lesson.discipline.name}
        description={`${formatCalendarDate(lesson.lessonDate)} · ${lessonTypeCopy[lesson.lessonType]} · ${completed ? "Завершено" : "Незавершено"}`}
        actions={
          <>
            <Button asChild variant="outline" size="lg">
              <Link href={periodHref}>
                <ArrowLeft aria-hidden="true" />
                В журнал
              </Link>
            </Button>
            {!periodCompleted ? (
              <LessonActions
                groupId={group.publicId}
                periodId={period.publicId}
                startsOn={period.startsOn}
                endsOn={period.endsOn}
                disciplines={editableDisciplines.map(
                  ({ publicId, name, isArchived }) => ({
                    publicId,
                    name,
                    isArchived,
                  }),
                )}
                lesson={{
                  publicId: lesson.publicId,
                  lessonDate: lesson.lessonDate,
                  lessonType: lesson.lessonType,
                  disciplineId: lesson.discipline.publicId,
                  disciplineName: lesson.discipline.name,
                }}
              />
            ) : null}
          </>
        }
      />

      <FormCard
        label={
          periodCompleted
            ? "Исторический просмотр занятия"
            : "Редактирование посещаемости занятия"
        }
      >
        <LessonForm
          groupId={group.publicId}
          periodId={period.publicId}
          startsOn={period.startsOn}
          endsOn={period.endsOn}
          defaultLessonDate={lesson.lessonDate}
          disciplines={[
            {
              publicId: lesson.discipline.publicId,
              name: lesson.discipline.name,
            },
          ]}
          members={attendance.map(({ attendance: entry, member }) => ({
            publicId: member.publicId,
            firstName: member.firstName,
            lastName: member.lastName,
            status: entry.status,
            comment: entry.comment,
          }))}
          lessonId={lesson.publicId}
          initialLesson={{
            lessonDate: lesson.lessonDate,
            disciplineId: lesson.discipline.publicId,
            disciplineName: lesson.discipline.name,
            lessonType: lesson.lessonType,
          }}
          readOnly={periodCompleted}
        />
      </FormCard>
    </div>
  );
}
