"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";

import { createGroupAction, updateGroupAction } from "@/features/groups/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FormError } from "@/features/groups/components/form-error";
import { FormField } from "@/features/groups/components/form-field";
import { useUnsavedChanges } from "@/features/groups/components/use-unsaved-changes";
import {
  periodTypes,
  type PeriodType,
} from "@/features/groups/domain/periods";
import { periodTypeCopy } from "@/features/groups/presentation/period-copy";
import { createGroupSchema, type GroupFormValues } from "@/features/groups/schemas";

type GroupFormFields = Omit<GroupFormValues, "periodType"> & {
  periodType: PeriodType | "";
};

export function GroupForm({
  mode,
  groupId,
  defaultName = "",
  defaultPeriodType,
  returnPeriodId,
}: {
  mode: "create" | "edit";
  groupId?: string;
  defaultName?: string;
  defaultPeriodType?: PeriodType;
  returnPeriodId?: string;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<GroupFormFields>({
    resolver: zodResolver(createGroupSchema) as Resolver<GroupFormFields>,
    defaultValues: { name: defaultName, periodType: defaultPeriodType ?? "" },
  });

  useUnsavedChanges(isDirty && !isSubmitting);

  const onSubmit = handleSubmit(async (values) => {
    const result =
      mode === "create"
        ? await createGroupAction(values as GroupFormValues)
        : await updateGroupAction(groupId!, { name: values.name }, returnPeriodId);

    if (result.status === "success") {
      reset(values);
      router.push(result.redirectTo);
      router.refresh();
      return;
    }

    if (result.status === "error") {
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        if (field === "name" || field === "periodType") {
          setError(field, { message });
        }
      }
      setError("root", { message: result.formError });
    }
  });

  const errorDescription = errors.name ? "group-name-error" : undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={errors.root?.message} />

      <FormField
        id="group-name"
        label="Название группы"
        error={errors.name?.message}
        className="space-y-3"
      >
        <Input
          id="group-name"
          className="mt-[15px]"
          autoComplete="off"
          autoFocus
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errorDescription}
          {...register("name")}
        />
      </FormField>

      {mode === "create" ? (
        <FormField
          id="group-period-type"
          label="Тип учебных периодов"
          error={errors.periodType?.message}
        >
          <NativeSelect
            id="group-period-type"
            defaultValue=""
            className="mt-3"
            aria-invalid={Boolean(errors.periodType)}
            aria-describedby={errors.periodType ? "group-period-type-error" : undefined}
            {...register("periodType")}
          >
            <option value="" disabled hidden>
              Выберите тип
            </option>
            {periodTypes.map((type) => (
              <option key={type} value={type}>
                {periodTypeCopy[type].plural}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      ) : null}

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
