"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { formatPeriodName } from "@/features/groups/domain/periods";
import type {
  AcademicPeriodFormValues,
  FirstAcademicPeriodFormValues,
  GroupFormValues,
} from "@/features/groups/schemas";
import { GroupServiceError } from "@/features/groups/server/errors";
import {
  createAcademicPeriod,
  createFirstAcademicPeriod,
  createGroup,
  getAcademicPeriod,
  getGroup,
  updateAcademicPeriod,
  updateGroup,
} from "@/features/groups/server/operations";

export type FormActionResult =
  | { status: "success"; redirectTo: string }
  | { status: "error"; formError: string; fieldErrors?: Record<string, string> }
  | { status: "overlap"; message: string };

function validationResult(error: ZodError): FormActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }

  return {
    status: "error",
    formError: "Проверьте заполненные поля.",
    fieldErrors,
  };
}

function operationError(error: unknown): FormActionResult {
  if (error instanceof ZodError) {
    const formFields = new Set(["name", "periodType", "number", "startsOn", "endsOn"]);
    const isFormValidationError = error.issues.some(
      (issue) => typeof issue.path[0] === "string" && formFields.has(issue.path[0]),
    );
    if (isFormValidationError) return validationResult(error);
  }

  if (error instanceof GroupServiceError) {
    if (error.code === "duplicate_period_number") {
      return {
        status: "error",
        formError: "Не удалось сохранить период.",
        fieldErrors: { number: "Период с таким номером уже существует." },
      };
    }
    if (error.code === "group_not_found" || error.code === "period_not_owned") {
      return { status: "error", formError: "Запрашиваемые данные не найдены." };
    }
    if (error.code === "period_type_already_set" || error.code === "first_period_conflict") {
      return {
        status: "error",
        formError: "Состояние группы изменилось. Обновите страницу и повторите попытку.",
      };
    }
  }

  return {
    status: "error",
    formError: "Не удалось сохранить изменения. Повторите попытку.",
  };
}

export async function createGroupAction(values: GroupFormValues): Promise<FormActionResult> {
  try {
    const group = await createGroup(values);
    revalidatePath("/");
    return {
      status: "success",
      redirectTo: `/groups/${group.id}?notice=group-created`,
    };
  } catch (error) {
    return operationError(error);
  }
}

export async function updateGroupAction(
  groupId: string,
  values: GroupFormValues,
  returnPeriodId?: string,
): Promise<FormActionResult> {
  try {
    await updateGroup(groupId, values);
    let redirectTo = `/groups/${groupId}?notice=group-updated`;

    if (returnPeriodId) {
      const period = await getAcademicPeriod(groupId, returnPeriodId);
      if (period) {
        redirectTo = `/groups/${groupId}/periods/${period.id}?notice=group-updated`;
      }
    }

    revalidatePath(`/groups/${groupId}`, "layout");
    return { status: "success", redirectTo };
  } catch (error) {
    return operationError(error);
  }
}

function overlapResult(
  periodType: NonNullable<Awaited<ReturnType<typeof getGroup>>>["periodType"],
  periods: Array<{ number: number }>,
): FormActionResult {
  if (!periodType || periods.length === 0) {
    return { status: "error", formError: "Не удалось проверить пересечение дат." };
  }
  const names = periods.map((period) => `„${formatPeriodName(periodType, period.number)}“`);
  return {
    status: "overlap",
    message: `Даты пересекаются с периодом ${names.join(", ")}.`,
  };
}

export async function createPeriodAction(
  groupId: string,
  values: FirstAcademicPeriodFormValues | AcademicPeriodFormValues,
  firstPeriod: boolean,
  forceOverlap = false,
): Promise<FormActionResult> {
  try {
    const group = await getGroup(groupId);
    if (!group) return { status: "error", formError: "Группа не найдена." };

    const result = firstPeriod
      ? await createFirstAcademicPeriod(groupId, {
          ...(values as FirstAcademicPeriodFormValues),
          forceOverlap,
        })
      : await createAcademicPeriod(groupId, {
          ...(values as AcademicPeriodFormValues),
          forceOverlap,
        });

    if (result.kind === "overlap") {
      const periodType = group.periodType ?? (values as FirstAcademicPeriodFormValues).periodType;
      return overlapResult(periodType, result.periods);
    }

    revalidatePath(`/groups/${groupId}`, "layout");
    return {
      status: "success",
      redirectTo: `/groups/${groupId}/periods/${result.period.id}?notice=period-created`,
    };
  } catch (error) {
    return operationError(error);
  }
}

export async function updatePeriodAction(
  groupId: string,
  periodId: string,
  values: AcademicPeriodFormValues,
  forceOverlap = false,
): Promise<FormActionResult> {
  try {
    const group = await getGroup(groupId);
    if (!group) return { status: "error", formError: "Группа не найдена." };

    const result = await updateAcademicPeriod(groupId, periodId, {
      ...values,
      forceOverlap,
    });
    if (result.kind === "overlap") return overlapResult(group.periodType, result.periods);

    revalidatePath(`/groups/${groupId}`, "layout");
    return {
      status: "success",
      redirectTo: `/groups/${groupId}/periods/${periodId}?notice=period-updated`,
    };
  } catch (error) {
    return operationError(error);
  }
}
