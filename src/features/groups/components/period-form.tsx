"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, type MouseEvent } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPeriodAction, updatePeriodAction } from "@/features/groups/actions";
import { FormError } from "@/features/groups/components/form-error";
import { FormField } from "@/features/groups/components/form-field";
import { useUnsavedChanges } from "@/features/groups/components/use-unsaved-changes";
import {
  findPeriodsWithInvertedNumberOrder,
  getSuggestedPeriodNumber,
  type PeriodSummary,
  type PeriodType,
} from "@/features/groups/domain/periods";
import {
  formatPeriodName,
  periodTypeCopy,
} from "@/features/groups/presentation/period-copy";
import {
  academicPeriodFormSchema,
  type AcademicPeriodFormValues,
} from "@/features/groups/schemas";

function showDatePicker(event: MouseEvent<HTMLInputElement>) {
  event.currentTarget.showPicker?.();
}

export function PeriodForm({
  mode,
  groupId,
  periodId,
  groupPeriodType,
  defaultValues,
  periods,
}: {
  mode: "create" | "edit";
  groupId: string;
  periodId?: string;
  groupPeriodType: PeriodType;
  defaultValues?: AcademicPeriodFormValues;
  periods: PeriodSummary[];
}) {
  const router = useRouter();
  const copy = periodTypeCopy[groupPeriodType];
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<AcademicPeriodFormValues>({
    resolver: zodResolver(academicPeriodFormSchema) as Resolver<AcademicPeriodFormValues>,
    defaultValues: {
      number: defaultValues?.number ?? getSuggestedPeriodNumber(periods),
      startsOn: defaultValues?.startsOn ?? "",
      endsOn: defaultValues?.endsOn ?? "",
    },
  });
  const number = useWatch({ control, name: "number" });
  const startsOn = useWatch({ control, name: "startsOn" });

  const numberOrderWarning = useMemo(() => {
    if (!Number.isInteger(number) || periods.length === 0) return undefined;

    const related = startsOn
      ? findPeriodsWithInvertedNumberOrder(
          { id: periodId ?? "new", number, startsOn, endsOn: startsOn },
          periods,
        )
      : periods
          .toSorted(
            (left, right) =>
              right.startsOn.localeCompare(left.startsOn) ||
              right.endsOn.localeCompare(left.endsOn),
          )
          .filter((candidate, index) => index === 0 && number <= candidate.number);

    if (related.length === 0) return undefined;
    const names = related
      .map((period) => `«${formatPeriodName(groupPeriodType, period.number)}»`)
      .join(", ");
    return `Номер не совпадает с хронологией относительно ${names}.`;
  }, [groupPeriodType, number, periodId, periods, startsOn]);

  useUnsavedChanges(isDirty && !isSubmitting);

  const save = async (values: AcademicPeriodFormValues) => {
    const result = await (mode === "create"
      ? createPeriodAction(groupId, values)
      : updatePeriodAction(groupId, periodId!, values));

    if (result.status === "success") {
      reset(values);
      router.push(result.redirectTo);
      router.refresh();
      return;
    }
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if (field === "number" || field === "startsOn" || field === "endsOn") {
        setError(field, { message });
      }
    }
    setError("root", { message: result.formError });
  };

  const onSubmit = handleSubmit(save);
  const describedBy = (field: keyof AcademicPeriodFormValues) =>
    errors[field]
      ? `${field}-error`
      : field === "number" && numberOrderWarning
        ? "number-warning"
        : undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormError message={errors.root?.message} />

      <FormField
        id="number"
        label={copy.numberLabel}
        error={errors.number?.message}
        warning={numberOrderWarning}
      >
        <Input
          id="number"
          className="mt-1"
          type="number"
          inputMode="numeric"
          min={1}
          max={99}
          step={1}
          aria-invalid={Boolean(errors.number)}
          aria-describedby={describedBy("number")}
          {...register("number", { valueAsNumber: true })}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="startsOn" label="Дата начала" error={errors.startsOn?.message}>
          <Input
            id="startsOn"
            className="mt-1"
            type="date"
            aria-invalid={Boolean(errors.startsOn)}
            aria-describedby={describedBy("startsOn")}
            {...register("startsOn")}
            onClick={showDatePicker}
          />
        </FormField>
        <FormField id="endsOn" label="Дата окончания" error={errors.endsOn?.message}>
          <Input
            id="endsOn"
            className="mt-1"
            type="date"
            aria-invalid={Boolean(errors.endsOn)}
            aria-describedby={describedBy("endsOn")}
            {...register("endsOn")}
            onClick={showDatePicker}
          />
        </FormField>
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting
          ? "Сохранение…"
          : mode === "create"
            ? copy.createAction
            : "Сохранить изменения"}
      </Button>
    </form>
  );
}
