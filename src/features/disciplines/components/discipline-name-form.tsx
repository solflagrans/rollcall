"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createDisciplineAction,
  renameDisciplineAction,
  setDisciplineArchivedAction,
} from "@/features/disciplines/actions";
import type { Discipline } from "@/features/disciplines/domain/disciplines";
import {
  disciplineFormSchema,
  type DisciplineFormValues,
} from "@/features/disciplines/schemas";
import { FormError } from "@/features/groups/components/form-error";
import { FormField } from "@/features/groups/components/form-field";
import { useActionLock } from "@/lib/use-action-lock";

type DisciplineSummary = Pick<Discipline, "publicId" | "name" | "isArchived">;

export function DisciplineNameForm({
  groupId,
  discipline,
  listStatus = "active",
  onSuccess,
  stayOnPage = false,
  onCancel,
}: {
  groupId: string;
  discipline?: DisciplineSummary;
  listStatus?: "active" | "archived";
  onSuccess?: (discipline: DisciplineSummary) => void;
  stayOnPage?: boolean;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const submission = useActionLock();
  const [recovery, setRecovery] = useState<DisciplineSummary>();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DisciplineFormValues>({
    resolver: zodResolver(disciplineFormSchema) as Resolver<DisciplineFormValues>,
    defaultValues: { name: discipline?.name ?? "" },
  });

  const finish = (result: {
    redirectTo: string;
    discipline?: DisciplineSummary;
  }) => {
    if (result.discipline) {
      reset({ name: "" });
      setRecovery(undefined);
      onSuccess?.(result.discipline);
      if (stayOnPage) return;
    }
    router.push(result.redirectTo);
  };

  const onSubmit = handleSubmit(async (values) => {
    setRecovery(undefined);
    const result = await submission.run(() =>
      discipline
        ? renameDisciplineAction(
            groupId,
            discipline.publicId,
            values,
            listStatus,
          )
        : createDisciplineAction(groupId, values),
    );
    if (!result) return;

    if (result.status === "success") {
      finish(result);
      return;
    }
    setRecovery(result.recovery);
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if (field === "name") setError("name", { message });
    }
    setError("root", { message: result.formError });
  });

  const restore = async () => {
    if (!recovery) return;
    const result = await submission.run(() =>
      setDisciplineArchivedAction(groupId, recovery.publicId, false),
    );
    if (!result) return;
    if (result.status === "success") {
      finish({
        ...result,
        discipline: result.discipline
          ? { ...result.discipline, isArchived: false }
          : undefined,
      });
      return;
    }
    setError("root", { message: result.formError });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={errors.root?.message} />
      <FormField id="discipline-name" label="Название" error={errors.name?.message}>
        <Input
          id="discipline-name"
          className="mt-1"
          autoFocus
          autoComplete="off"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "discipline-name-error" : undefined}
          {...register("name")}
        />
      </FormField>

      {recovery ? (
        <Button
          type="button"
          variant="secondary"
          disabled={submission.isLocked}
          onClick={() => void restore()}
        >
          {submission.isLocked
            ? "Восстановление…"
            : `Восстановить «${recovery.name}»`}
        </Button>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting || submission.isLocked}>
          {isSubmitting || submission.isLocked
            ? "Сохранение…"
            : discipline
              ? "Сохранить название"
              : "Создать дисциплину"}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            disabled={submission.isLocked}
            onClick={onCancel}
          >
            Отмена
          </Button>
        ) : null}
      </div>
    </form>
  );
}
