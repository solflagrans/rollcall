"use client";

import {
  MessageSquareText,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import {
  getAttendanceProgress,
  isLessonCompleted,
  type AttendanceStatus,
  type LessonType,
} from "@/features/lessons/domain/lessons";
import {
  attendanceStatusCopy,
  lessonTypeCopy,
  unmarkedAttendanceLabel,
} from "@/features/lessons/presentation/lesson-copy";
import { formatCalendarDate } from "@/features/groups/presentation/period-copy";
import { cn } from "@/lib/utils";

type JournalDiscipline = {
  publicId: string;
  name: string;
  isArchived: boolean;
};

type JournalAttendance = {
  groupMemberId: string;
  status: AttendanceStatus | null;
  comment: string | null;
};

type JournalLesson = {
  publicId: string;
  lessonDate: string;
  lessonType: LessonType;
  discipline: JournalDiscipline;
  attendance: JournalAttendance[];
};

type JournalMember = {
  publicId: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
};

type OpenComment = {
  memberName: string;
  lessonLabel: string;
  comment: string;
};

export function PeriodJournal({
  groupId,
  periodId,
  disciplines,
  lessons,
  members,
  disciplineSettings,
}: {
  groupId: string;
  periodId: string;
  disciplines: JournalDiscipline[];
  lessons: JournalLesson[];
  members: JournalMember[];
  disciplineSettings: React.ReactNode;
}) {
  const [disciplineId, setDisciplineId] = useState("all");
  const [incompleteOpen, setIncompleteOpen] = useState(false);
  const [openComment, setOpenComment] = useState<OpenComment>();
  const matrixScrollRef = useRef<HTMLDivElement>(null);
  const lessonDisciplineIds = useMemo(
    () => new Set(lessons.map(({ discipline }) => discipline.publicId)),
    [lessons],
  );
  const filterDisciplines = disciplines.filter(
    (discipline) =>
      !discipline.isArchived || lessonDisciplineIds.has(discipline.publicId),
  );
  const visibleLessons = useMemo(
    () =>
      disciplineId === "all"
        ? lessons
        : lessons.filter(
            ({ discipline }) => discipline.publicId === disciplineId,
          ),
    [disciplineId, lessons],
  );
  const attendanceByLessonAndMember = useMemo(
    () =>
      new Map(
        lessons.map((lesson) => [
          lesson.publicId,
          new Map(
            lesson.attendance.map((attendance) => [
              attendance.groupMemberId,
              attendance,
            ]),
          ),
        ]),
      ),
    [lessons],
  );
  const incompleteLessons = lessons.filter(
    ({ attendance }) => !isLessonCompleted(attendance),
  );
  const periodHref = `/groups/${groupId}/periods/${periodId}`;

  useLayoutEffect(() => {
    const matrix = matrixScrollRef.current;
    if (matrix) {
      matrix.scrollLeft = matrix.scrollWidth - matrix.clientWidth;
    }
  }, [disciplineId, visibleLessons.length]);

  return (
    <section className="space-y-5" aria-labelledby="journal-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <label
            htmlFor="journal-discipline-filter"
            className="text-sm font-medium"
          >
            Дисциплина
          </label>
          <NativeSelect
            id="journal-discipline-filter"
            className="mt-2 w-full sm:w-72"
            value={disciplineId}
            onChange={(event) => setDisciplineId(event.target.value)}
          >
            <option value="all">Все дисциплины</option>
            {filterDisciplines.map((discipline) => (
              <option key={discipline.publicId} value={discipline.publicId}>
                {discipline.name}
                {discipline.isArchived ? " (архив)" : ""}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="shrink-0">{disciplineSettings}</div>
      </div>

      {incompleteLessons.length > 0 ? (
        <IncompleteLessonsNotice
          groupId={groupId}
          periodId={periodId}
          lessons={incompleteLessons}
          onOpenList={() => setIncompleteOpen(true)}
        />
      ) : null}

      <div>
        <h2 id="journal-title" className="font-heading text-xl font-semibold">
          Журнал
        </h2>
      </div>

      {lessons.length === 0 ? (
        <div className="rounded-md border border-dashed bg-surface-subtle p-6 sm:p-8">
          <h3 className="font-heading text-lg font-semibold">
            В этом периоде пока нет занятий
          </h3>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Создайте занятие — первая колонка сразу появится в журнале.
          </p>
          <Button asChild className="mt-5">
            <Link href={`${periodHref}/lessons/new`}>
              <Plus aria-hidden="true" />
              Новое занятие
            </Link>
          </Button>
        </div>
      ) : visibleLessons.length === 0 ? (
        <div className="rounded-md border border-dashed bg-surface-subtle p-5 text-sm text-muted-foreground">
          По выбранной дисциплине занятий пока нет.
        </div>
      ) : (
        <div
          ref={matrixScrollRef}
          className="max-w-full overflow-x-auto rounded-md border bg-card"
          tabIndex={0}
          aria-label="Матрица посещаемости. Прокручивается по горизонтали."
        >
          <table className="w-max border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-20 w-px whitespace-nowrap border-r border-b bg-surface-subtle px-4 py-2 text-center align-middle font-medium"
                >
                  Участник
                </th>
                {visibleLessons.map((lesson) => {
                  const incomplete = !isLessonCompleted(lesson.attendance);
                  return (
                    <th
                      key={lesson.publicId}
                      scope="col"
                      className={cn(
                        "w-44 min-w-44 max-w-44 border-r border-b bg-surface-subtle p-0 text-center align-middle last:border-r-0",
                        incomplete && "bg-status-late-background",
                      )}
                    >
                      <Link
                        href={`${periodHref}/lessons/${lesson.publicId}`}
                        className="relative flex h-20 flex-col items-center justify-center px-3 py-2 text-center outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50"
                        title={lessonLabel(lesson)}
                      >
                        <span className="block tabular-nums font-semibold">
                          {formatShortDate(lesson.lessonDate)}
                        </span>
                        <span className="block w-full truncate font-medium">
                          {lesson.discipline.name}
                        </span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          {lessonTypeCopy[lesson.lessonType]}
                        </span>
                        {incomplete ? (
                          <span
                            className="absolute top-2 right-2 size-2 rounded-full bg-status-late-foreground"
                            title="Незавершено"
                            aria-label="Незавершено"
                          />
                        ) : null}
                      </Link>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const fullName = `${member.lastName} ${member.firstName}`;
                return (
                  <tr key={member.publicId}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 w-px whitespace-nowrap border-r border-b bg-card px-4 py-3 text-left font-medium"
                    >
                      <span className="block leading-snug" title={fullName}>
                        {fullName}
                      </span>
                      {!member.isActive ? (
                        <span className="mt-1 block text-xs font-normal text-muted-foreground">
                          Неактивен
                        </span>
                      ) : null}
                    </th>
                    {visibleLessons.map((lesson) => {
                      const attendance = attendanceByLessonAndMember
                        .get(lesson.publicId)
                        ?.get(member.publicId);
                      return (
                        <td
                          key={lesson.publicId}
                          className="h-16 border-r border-b p-2 text-center last:border-r-0"
                        >
                          {attendance ? (
                            <AttendanceCell
                              attendance={attendance}
                              memberName={fullName}
                              lessonLabel={lessonLabel(lesson)}
                              onOpenComment={setOpenComment}
                            />
                          ) : (
                            <span
                              className="inline-flex size-8 items-center justify-center rounded-sm bg-muted text-muted-foreground"
                              title="Не входил в состав занятия"
                              aria-label="Не входил в состав занятия"
                            >
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={incompleteOpen}
        onOpenChange={setIncompleteOpen}
        title="Незавершённые занятия"
        description="Выберите занятие, чтобы продолжить заполнение посещаемости."
      >
        <div className="divide-y rounded-md border">
          {incompleteLessons.map((lesson) => {
            const progress = getAttendanceProgress(lesson.attendance);
            return (
              <Link
                key={lesson.publicId}
                href={`${periodHref}/lessons/${lesson.publicId}`}
                className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50"
                onClick={() => setIncompleteOpen(false)}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {lesson.discipline.name}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {formatCalendarDate(lesson.lessonDate)} · {progress.marked} из{" "}
                    {progress.total}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium text-primary">
                  Продолжить
                </span>
              </Link>
            );
          })}
        </div>
      </Dialog>

      <Dialog
        open={Boolean(openComment)}
        onOpenChange={(open) => {
          if (!open) setOpenComment(undefined);
        }}
        title="Комментарий к отметке"
        description={
          openComment
            ? `${openComment.memberName} · ${openComment.lessonLabel}`
            : undefined
        }
      >
        <p className="whitespace-pre-wrap text-sm leading-6">
          {openComment?.comment}
        </p>
      </Dialog>
    </section>
  );
}

function AttendanceCell({
  attendance,
  memberName,
  lessonLabel: currentLessonLabel,
  onOpenComment,
}: {
  attendance: JournalAttendance;
  memberName: string;
  lessonLabel: string;
  onOpenComment: (comment: OpenComment) => void;
}) {
  const status = attendance.status;
  const label = status ? attendanceStatusCopy[status] : unmarkedAttendanceLabel;
  const symbol = status ? attendanceSymbol[status] : "…";

  return (
    <div className="relative flex h-8 w-full items-center justify-center">
      <span
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-sm border font-semibold",
          status ? attendanceClass[status] : "border-input bg-background",
        )}
        title={label}
        aria-label={label}
      >
        {symbol}
      </span>
      {attendance.comment ? (
        <button
          type="button"
          className="absolute left-1/2 ml-5 inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={`Показать комментарий: ${memberName}`}
          title="Есть комментарий"
          onClick={() =>
            onOpenComment({
              memberName,
              lessonLabel: currentLessonLabel,
              comment: attendance.comment!,
            })
          }
        >
          <MessageSquareText aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function IncompleteLessonsNotice({
  groupId,
  periodId,
  lessons,
  onOpenList,
}: {
  groupId: string;
  periodId: string;
  lessons: JournalLesson[];
  onOpenList: () => void;
}) {
  const single = lessons[0];
  const periodHref = `/groups/${groupId}/periods/${periodId}`;
  if (lessons.length === 1 && single) {
    const progress = getAttendanceProgress(single.attendance);
    return (
      <aside className="flex flex-col gap-3 rounded-md border border-status-late-border bg-status-late-background p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-status-late-foreground">
            Незавершённое занятие
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {single.discipline.name} · {formatCalendarDate(single.lessonDate)} ·{" "}
            отмечено {progress.marked} из {progress.total}
          </p>
        </div>
        <Button asChild variant="outline" className="self-start bg-background sm:self-auto">
          <Link href={`${periodHref}/lessons/${single.publicId}`}>Продолжить</Link>
        </Button>
      </aside>
    );
  }

  return (
    <aside className="flex items-center justify-between gap-4 rounded-md border border-status-late-border bg-status-late-background p-4">
      <p className="font-medium text-status-late-foreground">
        Незавершённых занятий: {lessons.length}
      </p>
      <Button type="button" variant="outline" className="bg-background" onClick={onOpenList}>
        Посмотреть
      </Button>
    </aside>
  );
}

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function lessonLabel(lesson: JournalLesson): string {
  return `${formatCalendarDate(lesson.lessonDate)}, ${lessonTypeCopy[lesson.lessonType]}, ${lesson.discipline.name}`;
}

const attendanceSymbol: Record<AttendanceStatus, string> = {
  present: "П",
  late: "О",
  absent: "Н",
  excused: "У",
};

const attendanceClass: Record<AttendanceStatus, string> = {
  present:
    "border-status-present-border bg-status-present-background text-status-present-foreground",
  late: "border-status-late-border bg-status-late-background text-status-late-foreground",
  absent:
    "border-status-absent-border bg-status-absent-background text-status-absent-foreground",
  excused:
    "border-status-excused-border bg-status-excused-background text-status-excused-foreground",
};
