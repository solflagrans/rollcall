"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { createPeriodAction, updatePeriodAction } from "@/features/groups/actions";
import { FormField } from "@/features/groups/components/form-field";
import { useUnsavedChanges } from "@/features/groups/components/use-unsaved-changes";
import {
  periodTypeLabels,
  periodTypes,
  type PeriodType,
} from "@/features/groups/domain/periods";
import {
  academicPeriodFormSchema,
  firstAcademicPeriodFormSchema,
  type AcademicPeriodFormValues,
  type FirstAcademicPeriodFormValues,
} from "@/features/groups/schemas";

type PeriodFormValues = AcademicPeriodFormValues & { periodType?: PeriodType | "" };

export function PeriodForm({
  mode,
  groupId,
  periodId,
  groupPeriodType,
  defaultValues,
}: {
  mode: "create" | "edit";
  groupId: string;
  periodId?: string;
  groupPeriodType: PeriodType | null;
  defaultValues?: AcademicPeriodFormValues;
}) {
  const firstPeriod = mode === "create" && groupPeriodType === null;
  const router = useRouter();
  const startsOnRef = useRef<HTMLInputElement | null>(null);
  const [overlapMessage, setOverlapMessage] = useState<string>();
  const [saving, setSaving] = useState(false);
  const schema = firstPeriod ? firstAcademicPeriodFormSchema : academicPeriodFormSchema;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    getValues,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PeriodFormValues>({
    resolver: zodResolver(schema) as Resolver<PeriodFormValues>,
    defaultValues: {
      periodType: groupPeriodType ?? "",
      number: defaultValues?.number,
      startsOn: defaultValues?.startsOn ?? "",
      endsOn: defaultValues?.endsOn ?? "",
    },
  });
  const startsOnRegistration = register("startsOn");

  const busy = isSubmitting || saving;
  useUnsavedChanges(isDirty && !busy);

  const save = async (values: PeriodFormValues, forceOverlap: boolean) => {
    if (saving) return;
    setSaving(true);
    setOverlapMessage(undefined);
    const result = await (mode === "create"
      ? createPeriodAction(
          groupId,
          values as FirstAcademicPeriodFormValues | AcademicPeriodFormValues,
          firstPeriod,
          forceOverlap,
        )
      : updatePeriodAction(
          groupId,
          periodId!,
          values as AcademicPeriodFormValues,
          forceOverlap,
        ));

    if (result.status === "success") {
      reset(values);
      router.push(result.redirectTo);
      router.refresh();
      setSaving(false);
      return;
    }
    if (result.status === "overlap") {
      setOverlapMessage(result.message);
      setSaving(false);
      return;
    }

    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if (field === "number" || field === "startsOn" || field === "endsOn" || field === "periodType") {
        setError(field, { message });
      }
    }
    setError("root", { message: result.formError });
    setSaving(false);
  };

  const onSubmit = handleSubmit((values) => save(values, false));
  const describedBy = (field: keyof PeriodFormValues) =>
    errors[field] ? `${field}-error` : undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {errors.root?.message ? (
        <div role="alert" className="rounded-sm border border-destructive/40 bg-status-absent-background p-3 text-sm text-status-absent-foreground">
          {errors.root.message}
        </div>
      ) : null}

      {firstPeriod ? (
        <FormField id="periodType" label="Тип периодов" error={errors.periodType?.message}>
          <NativeSelect
            id="periodType"
            aria-invalid={Boolean(errors.periodType)}
            aria-describedby={describedBy("periodType")}
            {...register("periodType")}
          >
            <option value="">Выберите тип</option>
            {periodTypes.map((type) => (
              <option key={type} value={type}>
                {periodTypeLabels[type]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      ) : (
        <div className="rounded-sm border bg-surface-subtle p-4">
          <p className="text-sm text-muted-foreground">Тип периодов</p>
          <p className="mt-1 font-medium">{periodTypeLabels[groupPeriodType!]}</p>
        </div>
      )}

      <FormField id="number" label="Номер" error={errors.number?.message}>
        <Input
          id="number"
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
            type="date"
            aria-invalid={Boolean(errors.startsOn)}
            aria-describedby={describedBy("startsOn")}
            {...startsOnRegistration}
            ref={(element) => {
              startsOnRegistration.ref(element);
              startsOnRef.current = element;
            }}
          />
        </FormField>
        <FormField id="endsOn" label="Дата окончания" error={errors.endsOn?.message}>
          <Input
            id="endsOn"
            type="date"
            aria-invalid={Boolean(errors.endsOn)}
            aria-describedby={describedBy("endsOn")}
            {...register("endsOn")}
          />
        </FormField>
      </div>

      {overlapMessage ? (
        <div role="alert" className="rounded-md border border-status-late-border bg-status-late-background p-4 text-status-late-foreground">
          <div className="flex gap-3">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">{overlapMessage}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOverlapMessage(undefined);
                    startsOnRef.current?.focus();
                  }}
                >
                  Изменить даты
                </Button>
                <Button type="button" onClick={() => void save(getValues(), true)} disabled={busy}>
                  Всё равно сохранить
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Button type="submit" size="lg" disabled={busy}>
        {busy
          ? "Сохранение…"
          : mode === "create"
            ? "Создать период"
            : "Сохранить изменения"}
      </Button>
    </form>
  );
}
