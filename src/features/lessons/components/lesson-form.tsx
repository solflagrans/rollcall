"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquare, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type MouseEvent } from "react";
import { useForm, type Resolver } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { LessonAttendanceStatistics } from "@/features/lessons/components/lesson-attendance-statistics";
import {
  createLessonAction,
  updateLessonAttendanceAction,
} from "@/features/lessons/actions";
import {
  attendanceStatuses,
  fillUnmarkedAttendance,
  getAttendanceProgress,
  resetAttendance,
  type AttendanceDraft,
  type AttendanceStatus,
} from "@/features/lessons/domain/lessons";
import {
  attendanceStatusCopy,
  lessonTypeCopy,
  unmarkedAttendanceLabel,
} from "@/features/lessons/presentation/lesson-copy";
import {
  lessonDetailsSchema,
  type LessonDetailsFormValues,
} from "@/features/lessons/schemas";
import { FormError } from "@/features/groups/components/form-error";
import { FormField } from "@/features/groups/components/form-field";
import { useUnsavedChanges } from "@/features/groups/components/use-unsaved-changes";
import { lessonTypes } from "@/features/lessons/domain/lessons";
import { cn } from "@/lib/utils";
import { useActionLock } from "@/lib/use-action-lock";

type DisciplineOption = {
  publicId: string;
  name: string;
};

type MemberOption = {
  publicId: string;
  firstName: string;
  lastName: string;
  status?: AttendanceStatus | null;
  comment?: string | null;
};

type DraftEntry = AttendanceDraft & MemberOption;

function serializeAttendance(entries: DraftEntry[]): string {
  return JSON.stringify(
    entries.map(({ groupMemberId, status, comment }) => ({
      groupMemberId,
      status,
      comment,
    })),
  );
}

function showDatePicker(event: MouseEvent<HTMLInputElement>) {
  event.currentTarget.showPicker?.();
}

export function LessonForm({
  groupId,
  periodId,
  startsOn,
  endsOn,
  defaultLessonDate,
  disciplines,
  members,
  lessonId,
  initialLesson,
  readOnly = false,
}: {
  groupId: string;
  periodId: string;
  startsOn: string;
  endsOn: string;
  defaultLessonDate: string;
  disciplines: DisciplineOption[];
  members: MemberOption[];
  lessonId?: string;
  initialLesson?: {
    lessonDate: string;
    disciplineId: string;
    disciplineName: string;
    lessonType: (typeof lessonTypes)[number];
  };
  readOnly?: boolean;
}) {
  const router = useRouter();
  const submission = useActionLock();
  const [attendance, setAttendance] = useState<DraftEntry[]>(() =>
    members.map((member) => ({
      ...member,
      groupMemberId: member.publicId,
      status: member.status ?? null,
      comment: member.comment ?? null,
    })),
  );
  const [expandedComments, setExpandedComments] = useState<Set<string>>(
    () => new Set(),
  );
  const [attendanceBaseline, setAttendanceBaseline] = useState(() =>
    serializeAttendance(
      members.map((member) => ({
        ...member,
        groupMemberId: member.publicId,
        status: member.status ?? null,
        comment: member.comment ?? null,
      })),
    ),
  );
  const [resetOpen, setResetOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<LessonDetailsFormValues>({
    resolver: zodResolver(lessonDetailsSchema) as Resolver<LessonDetailsFormValues>,
    defaultValues: {
      lessonDate: initialLesson?.lessonDate ?? defaultLessonDate,
      disciplineId: initialLesson?.disciplineId ?? "",
      lessonType: initialLesson?.lessonType,
    },
  });

  const progress = useMemo(() => getAttendanceProgress(attendance), [attendance]);
  const attendanceChanged = serializeAttendance(attendance) !== attendanceBaseline;
  const hasUnsavedChanges = isDirty || attendanceChanged;
  useUnsavedChanges(
    !readOnly && (isDirty || attendanceChanged) && !isSubmitting,
  );

  const updateEntry = (
    memberId: string,
    update: (entry: DraftEntry) => DraftEntry,
  ) => {
    setAttendance((current) =>
      current.map((entry) =>
        entry.groupMemberId === memberId ? update(entry) : entry,
      ),
    );
  };

  const setStatus = (memberId: string, status: AttendanceStatus) => {
    updateEntry(memberId, (entry) => ({
      ...entry,
      status: entry.status === status ? null : status,
    }));
  };

  const fillUnmarked = (status: AttendanceStatus) => {
    setAttendance((current) => fillUnmarkedAttendance(current, status));
  };

  const clearAttendance = () => {
    setAttendance((current) => resetAttendance(current));
    setExpandedComments(new Set());
    setResetOpen(false);
  };

  const save = async (values: LessonDetailsFormValues) => {
    const attendanceValues = attendance.map(
      ({ groupMemberId, status, comment }) => ({
        groupMemberId,
        status,
        comment,
      }),
    );
    const result = await submission.run(() =>
      lessonId
        ? updateLessonAttendanceAction(groupId, periodId, lessonId, {
            attendance: attendanceValues,
          })
        : createLessonAction(groupId, periodId, {
            ...values,
            attendance: attendanceValues,
          }),
    );
    if (!result) return;
    if (result.status === "success") {
      reset(values);
      setAttendanceBaseline(serializeAttendance(attendance));
      router.push(result.redirectTo);
      return;
    }
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if (
        field === "lessonDate" ||
        field === "disciplineId" ||
        field === "lessonType"
      ) {
        setError(field, { message });
      }
    }
    setError("root", { message: result.formError });
  };

  return (
    <form
      onSubmit={handleSubmit(save)}
      noValidate
      className={cn("min-w-0 space-y-8", !readOnly && "pb-28")}
    >
      <FormError message={errors.root?.message} />

      {!initialLesson ? (
        <section className="space-y-5" aria-labelledby="lesson-details-title">
          <h2 id="lesson-details-title" className="font-heading text-xl font-semibold">
            Занятие
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            <FormField
              id="lessonDate"
              label="Дата занятия"
              error={errors.lessonDate?.message}
            >
              <Input
                id="lessonDate"
                type="date"
                min={startsOn}
                max={endsOn}
                aria-invalid={Boolean(errors.lessonDate)}
                {...register("lessonDate")}
                onClick={showDatePicker}
              />
            </FormField>

            <FormField
              id="disciplineId"
              label="Дисциплина"
              error={errors.disciplineId?.message}
            >
              <NativeSelect
                id="disciplineId"
                aria-invalid={Boolean(errors.disciplineId)}
                {...register("disciplineId")}
              >
                <option value="" disabled hidden>
                  Выберите дисциплину
                </option>
                {disciplines.map((discipline) => (
                  <option key={discipline.publicId} value={discipline.publicId}>
                    {discipline.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>

            <FormField
              id="lessonType"
              label="Тип занятия"
              error={errors.lessonType?.message}
            >
              <NativeSelect
                id="lessonType"
                aria-invalid={Boolean(errors.lessonType)}
                {...register("lessonType")}
              >
                <option value="" disabled hidden>
                  Выберите тип
                </option>
                {lessonTypes.map((lessonType) => (
                  <option key={lessonType} value={lessonType}>
                    {lessonTypeCopy[lessonType]}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
        </section>
      ) : null}

      <section className="space-y-5" aria-labelledby="attendance-title">
        <div className="space-y-4">
          <div>
            <h2 id="attendance-title" className="font-heading text-xl font-semibold">
              Посещаемость
            </h2>
            <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
              Отмечено {progress.marked} из {progress.total} ·{" "}
              <span className={progress.completed ? "text-status-present-foreground" : "text-warning-foreground"}>
                {progress.completed ? "Завершено" : "Незавершено"}
              </span>
            </p>
          </div>

          <div className="flex flex-col items-start gap-2">
            {!readOnly && progress.unmarked > 0 ? (
              <>
                <div className="flex flex-wrap justify-start gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fillUnmarked("present")}
                  >
                    Все присутствуют
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fillUnmarked("absent")}
                  >
                    Все отсутствуют
                  </Button>
                </div>
                <p className="text-left text-sm text-muted-foreground">
                  Будут заполнены только {progress.unmarked} неотмеченных.
                </p>
              </>
            ) : null}
            {!readOnly &&
            (progress.marked > 0 || attendance.some(({ comment }) => comment)) ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setResetOpen(true)}>
                <RotateCcw aria-hidden="true" />
                Сбросить отметки
              </Button>
            ) : null}
          </div>
        </div>

        {initialLesson ? (
          <LessonAttendanceStatistics attendance={attendance} />
        ) : null}

        {attendance.length > 0 ? (
          <div className="min-w-0 overflow-hidden rounded-md border bg-card">
            {attendance.map((entry) => {
              const commentOpen = expandedComments.has(entry.groupMemberId);
              const fullName = `${entry.lastName} ${entry.firstName}`;
              const currentLabel = entry.status
                ? attendanceStatusCopy[entry.status]
                : unmarkedAttendanceLabel;
              return (
                <article
                  key={entry.groupMemberId}
                  className="min-w-0 border-b p-4 last:border-b-0"
                >
                  <div className="grid min-w-0 items-start gap-4 md:grid-cols-[clamp(112px,18vw,156px)_minmax(0,1fr)_2rem] md:items-center md:gap-3">
                    <div className="min-w-0">
                      <p
                        className="line-clamp-2 break-words font-medium leading-snug"
                        title={fullName}
                      >
                        {fullName}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {currentLabel}
                      </p>
                    </div>

                    <div
                      role="group"
                      aria-label={`Статус: ${fullName}`}
                      className="grid min-w-0 grid-cols-2 gap-2 md:flex md:w-fit md:max-w-full md:flex-wrap md:justify-self-start md:gap-1.5"
                    >
                      {readOnly ? (
                        <span
                          className={cn(
                            "inline-flex min-h-11 w-full items-center justify-center rounded-sm border px-3 text-sm font-medium md:min-h-10 md:w-auto md:min-w-32",
                            entry.status
                              ? selectedStatusClass[entry.status]
                              : "border-input bg-background text-muted-foreground",
                          )}
                        >
                          {currentLabel}
                        </span>
                      ) : attendanceStatuses.map((status) => {
                        const statusClassName = cn(
                          "min-h-11 min-w-0 w-full whitespace-nowrap rounded-sm border px-2 text-sm font-medium md:min-h-[clamp(2rem,3vw,2.5rem)] md:w-auto md:min-w-[clamp(5.5rem,8vw,7.5rem)] md:max-w-36 md:px-[clamp(0.5rem,1vw,0.875rem)] md:text-[clamp(0.75rem,1vw,0.875rem)]",
                          entry.status === status
                            ? selectedStatusClass[status]
                            : "bg-background text-muted-foreground",
                        );
                        return (
                          <button
                            key={status}
                            type="button"
                            aria-pressed={entry.status === status}
                            className={cn(
                              statusClassName,
                              "transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                            )}
                            onClick={() => setStatus(entry.groupMemberId, status)}
                          >
                            {attendanceStatusCopy[status]}
                          </button>
                        );
                      })}
                    </div>

                    {!readOnly || entry.comment ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="justify-self-start md:size-8 md:px-0"
                        aria-expanded={commentOpen}
                        aria-controls={`comment-${entry.groupMemberId}`}
                        aria-label={`Комментарий: ${fullName}`}
                        onClick={() => {
                          setExpandedComments((current) => {
                            const next = new Set(current);
                            if (next.has(entry.groupMemberId)) {
                              next.delete(entry.groupMemberId);
                            } else {
                              next.add(entry.groupMemberId);
                            }
                            return next;
                          });
                        }}
                      >
                        <MessageSquare aria-hidden="true" />
                        <span className="md:sr-only">
                          {entry.comment ? "Комментарий добавлен" : "Комментарий"}
                        </span>
                      </Button>
                    ) : (
                      <span className="hidden md:block" />
                    )}
                  </div>

                  {commentOpen ? (
                    <div id={`comment-${entry.groupMemberId}`} className="mt-4 md:ml-auto md:max-w-2xl">
                      {readOnly ? (
                        <>
                          <p className="text-sm font-medium">Комментарий</p>
                          <p className="mt-2 whitespace-pre-wrap rounded-sm border bg-surface-subtle p-3 text-sm">
                            {entry.comment}
                          </p>
                        </>
                      ) : (
                        <>
                          <label
                            htmlFor={`comment-input-${entry.groupMemberId}`}
                            className="text-sm font-medium"
                          >
                            Комментарий
                          </label>
                          <textarea
                            id={`comment-input-${entry.groupMemberId}`}
                            rows={2}
                            maxLength={500}
                            value={entry.comment ?? ""}
                            className="mt-2 w-full resize-y rounded-sm border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                            placeholder="Необязательный комментарий"
                            onChange={(event) =>
                              updateEntry(entry.groupMemberId, (current) => ({
                                ...current,
                                comment: event.target.value || null,
                              }))
                            }
                          />
                        </>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div data-surface="subtle" className="rounded-md bg-surface-subtle p-5 text-sm text-muted-foreground">
            {initialLesson
              ? "В слепке состава этого занятия нет участников."
              : "В активном составе нет участников. Занятие будет сохранено без отметок посещаемости."}
          </div>
        )}
      </section>

      {!readOnly ? (
        <div
          className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 md:right-4 md:left-64"
          aria-label="Сохранение посещаемости"
        >
          <div className="pointer-events-auto mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-md border bg-card/95 p-3 shadow-sm backdrop-blur sm:px-4">
            <p className="min-w-0 text-sm text-muted-foreground" aria-live="polite">
              <span className="font-medium text-foreground">
                {lessonId && !hasUnsavedChanges
                  ? "Все изменения сохранены"
                  : `Отмечено ${progress.marked} из ${progress.total}`}
              </span>
              {lessonId && !hasUnsavedChanges ? null : (
                <span className="hidden sm:inline">
                  {progress.completed ? " · Занятие завершено" : " · Есть неотмеченные"}
                </span>
              )}
            </p>
            <Button
              type="submit"
              size="lg"
              className="shrink-0"
              aria-label={
                lessonId ? "Сохранить посещаемость" : "Сохранить занятие"
              }
              disabled={
                isSubmitting ||
                submission.isLocked ||
                Boolean(lessonId && !hasUnsavedChanges)
              }
            >
              {isSubmitting || submission.isLocked
                ? "Сохранение…"
                : (
                    <>
                      <span className="sm:hidden">Сохранить</span>
                      <span className="hidden sm:inline">
                        {lessonId
                          ? "Сохранить посещаемость"
                          : "Сохранить занятие"}
                      </span>
                    </>
                  )}
            </Button>
          </div>
        </div>
      ) : null}

      <ConfirmationDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Сбросить отметки?"
        description="Статусы и комментарии будут очищены локально. Изменение вступит в силу после сохранения занятия."
        confirmLabel="Сбросить отметки"
        destructive
        onConfirm={clearAttendance}
      >
        После сброса все участники снова будут иметь статус «Не отмечено».
      </ConfirmationDialog>
    </form>
  );
}

const selectedStatusClass: Record<AttendanceStatus, string> = {
  present:
    "border-status-present-border bg-status-present-background text-status-present-foreground",
  late: "border-status-late-border bg-status-late-background text-status-late-foreground",
  absent:
    "border-status-absent-border bg-status-absent-background text-status-absent-foreground",
  excused:
    "border-status-excused-border bg-status-excused-background text-status-excused-foreground",
};
