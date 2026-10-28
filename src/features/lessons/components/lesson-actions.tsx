"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { useForm, type Resolver } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  ContextMenu,
  contextMenuItemClassName,
} from "@/components/ui/context-menu";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  deleteLessonAction,
  updateLessonAction,
} from "@/features/lessons/actions";
import { FormError } from "@/features/groups/components/form-error";
import { FormField } from "@/features/groups/components/form-field";
import { useUnsavedChanges } from "@/features/groups/components/use-unsaved-changes";
import { formatCalendarDate } from "@/features/groups/presentation/period-copy";
import {
  lessonTypes,
  type LessonType,
} from "@/features/lessons/domain/lessons";
import { lessonTypeCopy } from "@/features/lessons/presentation/lesson-copy";
import {
  lessonDetailsSchema,
  type LessonDetailsFormValues,
} from "@/features/lessons/schemas";
import { cn } from "@/lib/utils";
import { useActionLock } from "@/lib/use-action-lock";

type DisciplineOption = {
  publicId: string;
  name: string;
  isArchived: boolean;
};

type LessonSummary = {
  publicId: string;
  lessonDate: string;
  lessonType: LessonType;
  disciplineId: string;
  disciplineName: string;
};

export function LessonActions({
  groupId,
  periodId,
  startsOn,
  endsOn,
  disciplines,
  lesson,
}: {
  groupId: string;
  periodId: string;
  startsOn: string;
  endsOn: string;
  disciplines: DisciplineOption[];
  lesson: LessonSummary;
}) {
  const router = useRouter();
  const deletion = useActionLock();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();

  const deleteLesson = async () => {
    setDeleteError(undefined);
    const result = await deletion.run(() =>
      deleteLessonAction(groupId, periodId, lesson.publicId),
    );
    if (!result) return;
    if (result.status === "success") {
      router.push(result.redirectTo);
      return;
    }
    setDeleteError(result.formError);
  };

  return (
    <>
      <ContextMenu label="Действия занятия">
        {(close) => (
          <>
            <button
              type="button"
              role="menuitem"
              className={contextMenuItemClassName}
              onClick={() => {
                close();
                setEditOpen(true);
              }}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Редактировать занятие
            </button>
            <button
              type="button"
              role="menuitem"
              className={cn(
                contextMenuItemClassName,
                "text-destructive hover:text-destructive",
              )}
              onClick={() => {
                close();
                setDeleteOpen(true);
              }}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Удалить занятие
            </button>
          </>
        )}
      </ContextMenu>

      <Dialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Редактировать занятие"
        description="Период и сохранённый слепок состава останутся без изменений."
      >
        {editOpen ? (
          <LessonMetadataForm
            groupId={groupId}
            periodId={periodId}
            startsOn={startsOn}
            endsOn={endsOn}
            disciplines={disciplines}
            lesson={lesson}
            onSuccess={() => setEditOpen(false)}
            onCancel={() => setEditOpen(false)}
          />
        ) : null}
      </Dialog>

      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deletion.isLocked) setDeleteOpen(open);
        }}
        title="Удалить занятие?"
        description={`${formatCalendarDate(lesson.lessonDate)} · ${lessonTypeCopy[lesson.lessonType]} · ${lesson.disciplineName}`}
        confirmLabel="Удалить занятие"
        pendingLabel="Удаление…"
        pending={deletion.isLocked}
        destructive
        error={deleteError}
        onConfirm={deleteLesson}
      >
        Вместе с занятием будут безвозвратно удалены все связанные отметки
        посещаемости и комментарии.
      </ConfirmationDialog>
    </>
  );
}

function LessonMetadataForm({
  groupId,
  periodId,
  startsOn,
  endsOn,
  disciplines,
  lesson,
  onSuccess,
  onCancel,
}: {
  groupId: string;
  periodId: string;
  startsOn: string;
  endsOn: string;
  disciplines: DisciplineOption[];
  lesson: LessonSummary;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const submission = useActionLock();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<LessonDetailsFormValues>({
    resolver: zodResolver(lessonDetailsSchema) as Resolver<LessonDetailsFormValues>,
    defaultValues: {
      lessonDate: lesson.lessonDate,
      disciplineId: lesson.disciplineId,
      lessonType: lesson.lessonType,
    },
  });
  useUnsavedChanges(isDirty && !isSubmitting);

  const submit = handleSubmit(async (values) => {
    const result = await submission.run(() =>
      updateLessonAction(groupId, periodId, lesson.publicId, values),
    );
    if (!result) return;
    if (result.status === "success") {
      onSuccess();
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
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormError message={errors.root?.message} />
      <FormField
        id="edit-lesson-date"
        label="Дата занятия"
        error={errors.lessonDate?.message}
      >
        <Input
          id="edit-lesson-date"
          className="mt-2"
          type="date"
          min={startsOn}
          max={endsOn}
          autoFocus
          aria-invalid={Boolean(errors.lessonDate)}
          {...register("lessonDate")}
          onClick={showDatePicker}
        />
      </FormField>

      <FormField
        id="edit-lesson-discipline"
        label="Дисциплина"
        error={errors.disciplineId?.message}
      >
        <NativeSelect
          id="edit-lesson-discipline"
          className="mt-2"
          aria-invalid={Boolean(errors.disciplineId)}
          {...register("disciplineId")}
        >
          {disciplines.map((discipline) => (
            <option key={discipline.publicId} value={discipline.publicId}>
              {discipline.name}
              {discipline.isArchived ? " (архив)" : ""}
            </option>
          ))}
        </NativeSelect>
      </FormField>

      <FormField
        id="edit-lesson-type"
        label="Тип занятия"
        error={errors.lessonType?.message}
      >
        <NativeSelect
          id="edit-lesson-type"
          className="mt-2"
          aria-invalid={Boolean(errors.lessonType)}
          {...register("lessonType")}
        >
          {lessonTypes.map((lessonType) => (
            <option key={lessonType} value={lessonType}>
              {lessonTypeCopy[lessonType]}
            </option>
          ))}
        </NativeSelect>
      </FormField>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={isSubmitting || submission.isLocked}>
          {isSubmitting || submission.isLocked
            ? "Сохранение…"
            : "Сохранить изменения"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={submission.isLocked}
          onClick={onCancel}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}

function showDatePicker(event: MouseEvent<HTMLInputElement>) {
  event.currentTarget.showPicker?.();
}
