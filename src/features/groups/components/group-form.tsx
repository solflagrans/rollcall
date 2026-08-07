"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { createGroupAction, updateGroupAction } from "@/features/groups/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/features/groups/components/form-field";
import { useUnsavedChanges } from "@/features/groups/components/use-unsaved-changes";
import { createGroupSchema, type GroupFormValues } from "@/features/groups/schemas";

export function GroupForm({
  mode,
  groupId,
  defaultName = "",
  returnPeriodId,
}: {
  mode: "create" | "edit";
  groupId?: string;
  defaultName?: string;
  returnPeriodId?: string;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: defaultName },
  });

  useUnsavedChanges(isDirty && !isSubmitting);

  const onSubmit = handleSubmit(async (values) => {
    const result =
      mode === "create"
        ? await createGroupAction(values)
        : await updateGroupAction(groupId!, values, returnPeriodId);

    if (result.status === "success") {
      reset(values);
      router.push(result.redirectTo);
      router.refresh();
      return;
    }

    if (result.status === "error") {
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        if (field === "name") setError("name", { message });
      }
      setError("root", { message: result.formError });
    }
  });

  const errorDescription = errors.name ? "group-name-error" : "group-name-hint";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {errors.root?.message ? (
        <div role="alert" className="rounded-sm border border-destructive/40 bg-status-absent-background p-3 text-sm text-status-absent-foreground">
          {errors.root.message}
        </div>
      ) : null}

      <FormField
        id="group-name"
        label="Название группы"
        hint="Например, 2436 или ИВТ-21"
        error={errors.name?.message}
      >
        <Input
          id="group-name"
          autoComplete="off"
          autoFocus
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errorDescription}
          {...register("name")}
        />
      </FormField>

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting
          ? "Сохранение…"
          : mode === "create"
            ? "Создать группу"
            : "Сохранить изменения"}
      </Button>
    </form>
  );
}
