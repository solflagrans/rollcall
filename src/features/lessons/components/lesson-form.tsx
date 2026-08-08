"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquare, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type MouseEvent } from "react";
import { useForm, type Resolver } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { createLessonAction } from "@/features/lessons/actions";
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

type DisciplineOption = {
  publicId: string;
  name: string;
};

type MemberOption = {
  publicId: string;
  firstName: string;
  lastName: string;
};

type DraftEntry = AttendanceDraft & MemberOption;

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
}: {
  groupId: string;
  periodId: string;
  startsOn: string;
  endsOn: string;
  defaultLessonDate: string;
  disciplines: DisciplineOption[];
  members: MemberOption[];
}) {
  const router = useRouter();
  const [attendance, setAttendance] = useState<DraftEntry[]>(() =>
    members.map((member) => ({
      ...member,
      groupMemberId: member.publicId,
      status: null,
      comment: null,
    })),
  );
  const [expandedComments, setExpandedComments] = useState<Set<string>>(
    () => new Set(),
  );
  const [attendanceChanged, setAttendanceChanged] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<LessonDetailsFormValues>({
    resolver: zodResolver(lessonDetailsSchema) as Resolver<LessonDetailsFormValues>,
    defaultValues: {
      lessonDate: defaultLessonDate,
      disciplineId: "",
      lessonType: undefined,
    },
  });

  const progress = useMemo(() => getAttendanceProgress(attendance), [attendance]);
  useUnsavedChanges((isDirty || attendanceChanged) && !isSubmitting);

  const updateEntry = (
    memberId: string,
    update: (entry: DraftEntry) => DraftEntry,
  ) => {
    setAttendance((current) =>
      current.map((entry) =>
        entry.groupMemberId === memberId ? update(entry) : entry,
      ),
    );
    setAttendanceChanged(true);
  };

  const setStatus = (memberId: string, status: AttendanceStatus) => {
    updateEntry(memberId, (entry) => ({
      ...entry,
      status: entry.status === status ? null : status,
    }));
  };

  const fillUnmarked = (status: AttendanceStatus) => {
    setAttendance((current) => fillUnmarkedAttendance(current, status));
    setAttendanceChanged(true);
  };

  const clearAttendance = () => {
    if (!window.confirm("Сбросить все статусы и комментарии этого занятия?")) {
      return;
    }
    setAttendance((current) => resetAttendance(current));
    setExpandedComments(new Set());
    setAttendanceChanged(true);
  };

  const save = async (values: LessonDetailsFormValues) => {
    const result = await createLessonAction(groupId, periodId, {
      ...values,
      attendance: attendance.map(({ groupMemberId, status, comment }) => ({
        groupMemberId,
        status,
        comment,
      })),
    });
    if (result.status === "success") {
      reset(values);
      setAttendanceChanged(false);
      router.push(result.redirectTo);
      router.refresh();
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
    <form onSubmit={handleSubmit(save)} noValidate className="min-w-0 space-y-8">
      <FormError message={errors.root?.message} />

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
              className="mt-1"
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
              className="mt-1"
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
              className="mt-1"
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

      <section className="space-y-5" aria-labelledby="attendance-title">
        <div className="space-y-4">
          <div>
            <h2 id="attendance-title" className="font-heading text-xl font-semibold">
              Посещаемость
            </h2>
            <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
              Отмечено {progress.marked} из {progress.total} ·{" "}
              <span className={progress.completed ? "text-status-present-foreground" : "text-status-late-foreground"}>
                {progress.completed ? "Завершено" : "Незавершено"}
              </span>
            </p>
          </div>

          <div className="flex flex-col items-start gap-2">
            {progress.unmarked > 0 ? (
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
            {progress.marked > 0 || attendance.some(({ comment }) => comment) ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearAttendance}>
                <RotateCcw aria-hidden="true" />
                Сбросить отметки
              </Button>
            ) : null}
          </div>
        </div>

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
                      {attendanceStatuses.map((status) => (
                        <button
                          key={status}
                          type="button"
                          aria-pressed={entry.status === status}
                          className={cn(
                            "min-h-11 min-w-0 w-full whitespace-nowrap rounded-sm border px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-[clamp(2rem,3vw,2.5rem)] md:w-auto md:min-w-[clamp(5.5rem,8vw,7.5rem)] md:max-w-36 md:px-[clamp(0.5rem,1vw,0.875rem)] md:text-[clamp(0.75rem,1vw,0.875rem)]",
                            entry.status === status
                              ? selectedStatusClass[status]
                              : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                          onClick={() => setStatus(entry.groupMemberId, status)}
                        >
                          {attendanceStatusCopy[status]}
                        </button>
                      ))}
                    </div>

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
                          if (next.has(entry.groupMemberId)) next.delete(entry.groupMemberId);
                          else next.add(entry.groupMemberId);
                          return next;
                        });
                      }}
                    >
                      <MessageSquare aria-hidden="true" />
                      <span className="md:sr-only">
                        {entry.comment ? "Комментарий добавлен" : "Комментарий"}
                      </span>
                    </Button>
                  </div>

                  {commentOpen ? (
                    <div id={`comment-${entry.groupMemberId}`} className="mt-4 md:ml-auto md:max-w-2xl">
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
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-dashed bg-surface-subtle p-5 text-sm text-muted-foreground">
            В активном составе нет участников. Занятие будет сохранено без отметок посещаемости.
          </div>
        )}
      </section>

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Сохранение…" : "Сохранить занятие"}
      </Button>
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
