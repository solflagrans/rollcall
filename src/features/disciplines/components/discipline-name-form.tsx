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
  const [recovery, setRecovery] = useState<DisciplineSummary>();
  const [recoveryPending, setRecoveryPending] = useState(false);
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
    router.refresh();
  };

  const onSubmit = handleSubmit(async (values) => {
    setRecovery(undefined);
    const result = discipline
      ? await renameDisciplineAction(
          groupId,
          discipline.publicId,
          values,
          listStatus,
        )
      : await createDisciplineAction(groupId, values);

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
    if (!recovery || recoveryPending) return;
    setRecoveryPending(true);
    const result = await setDisciplineArchivedAction(
      groupId,
      recovery.publicId,
      false,
    );
    setRecoveryPending(false);
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
          disabled={recoveryPending}
          onClick={() => void restore()}
        >
          {recoveryPending ? "Восстановление…" : `Восстановить «${recovery.name}»`}
        </Button>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting || recoveryPending}>
          {isSubmitting
            ? "Сохранение…"
            : discipline
              ? "Сохранить название"
              : "Создать дисциплину"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
        ) : null}
      </div>
    </form>
  );
}
