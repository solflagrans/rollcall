"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { ZodError } from "zod";

import { getAuthorizationErrorMessage } from "@/features/auth/server/authorization";
import type { PeriodType } from "@/features/groups/domain/periods";
import {
  formatCalendarDate,
  formatPeriodName,
} from "@/features/groups/presentation/period-copy";
import type {
  AcademicPeriodFormValues,
  GroupFormValues,
  UpdateGroupInput,
} from "@/features/groups/schemas";
import { GroupServiceError } from "@/features/groups/server/errors";
import {
  createAcademicPeriod,
  createGroup,
  GROUPS_CACHE_TAG,
  getAcademicPeriod,
  getGroupCacheTag,
  updateAcademicPeriod,
  updateGroup,
} from "@/features/groups/server/operations";
import type { PeriodMutationResult } from "@/features/groups/server/service";
import type { Group } from "@/features/groups/domain/models";
import type { FormActionResult } from "@/lib/form-action";
import { logUnexpectedOperationError } from "@/lib/server/log-operation-error";
import { getZodFieldErrors } from "@/lib/zod-errors";

function validationResult(error: ZodError): FormActionResult {
  const fieldErrors = getZodFieldErrors(
    error,
    new Set(["name", "periodType", "number", "startsOn", "endsOn"]),
  );

  return {
    status: "error",
    formError: "Проверьте заполненные поля.",
    fieldErrors,
  };
}

function operationError(error: unknown): FormActionResult {
  const authorizationMessage = getAuthorizationErrorMessage(error);
  if (authorizationMessage) return { status: "error", formError: authorizationMessage };
  if (error instanceof ZodError) {
    const formFields = new Set(["name", "periodType", "number", "startsOn", "endsOn"]);
    const isFormValidationError = error.issues.some(
      (issue) => typeof issue.path[0] === "string" && formFields.has(issue.path[0]),
    );
    if (isFormValidationError) return validationResult(error);
  }

  if (error instanceof GroupServiceError) {
    if (error.code === "overlapping_period_dates") {
      return {
        status: "error",
        formError: "Выбранные даты пересекаются с уже сохранённым диапазоном.",
      };
    }
    if (
      error.code === "period_starts_after_earliest_lesson" &&
      error.conflictingLessonDate
    ) {
      return {
        status: "error",
        formError: `Дата начала не может быть позже занятия ${formatCalendarDate(error.conflictingLessonDate)}`,
        fieldErrors: {
          startsOn: `Самое раннее занятие назначено на ${formatCalendarDate(error.conflictingLessonDate)}`,
        },
      };
    }
    if (
      error.code === "period_ends_before_latest_lesson" &&
      error.conflictingLessonDate
    ) {
      return {
        status: "error",
        formError: `Дата окончания не может быть раньше занятия ${formatCalendarDate(error.conflictingLessonDate)}`,
        fieldErrors: {
          endsOn: `Самое позднее занятие назначено на ${formatCalendarDate(error.conflictingLessonDate)}`,
        },
      };
    }
    if (error.code === "group_not_found" || error.code === "period_not_owned") {
      return { status: "error", formError: "Запрашиваемые данные не найдены." };
    }
  }

  logUnexpectedOperationError("groups", error);

  return {
    status: "error",
    formError: "Не удалось сохранить изменения. Повторите попытку.",
  };
}

function invalidateGroup(group: Pick<Group, "id" | "publicId">, includeList = false) {
  updateTag(getGroupCacheTag(group.id));
  updateTag(getGroupCacheTag(group.publicId));
  if (includeList) updateTag(GROUPS_CACHE_TAG);
}

export async function createGroupAction(values: GroupFormValues): Promise<FormActionResult> {
  try {
    const group = await createGroup(values);
    updateTag(GROUPS_CACHE_TAG);
    (await cookies()).set("rollcall.current-group", group.publicId, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return {
      status: "success",
      redirectTo: `/groups/${group.publicId}?notice=group-created`,
    };
  } catch (error) {
    return operationError(error);
  }
}

export async function updateGroupAction(
  groupId: string,
  values: UpdateGroupInput,
  returnPeriodId?: string,
): Promise<FormActionResult> {
  try {
    const group = await updateGroup(groupId, values);
    invalidateGroup(group, true);
    let redirectTo = `/groups/${group.publicId}?notice=group-updated`;

    if (returnPeriodId) {
      const period = await getAcademicPeriod(group.publicId, returnPeriodId);
      if (period) {
        redirectTo = `/groups/${group.publicId}/periods/${period.publicId}?notice=group-updated`;
      }
    }

    return { status: "success", redirectTo };
  } catch (error) {
    return operationError(error);
  }
}

function formatRelatedPeriods(
  periodType: PeriodType,
  periods: Array<{ number: number }>,
): string {
  return periods
    .map((period) => `«${formatPeriodName(periodType, period.number)}»`)
    .join(", ");
}

export async function createPeriodAction(
  groupId: string,
  values: AcademicPeriodFormValues,
): Promise<FormActionResult> {
  return mutatePeriod(
    () => createAcademicPeriod(groupId, values),
    "period-created",
  );
}

export async function updatePeriodAction(
  groupId: string,
  periodId: string,
  values: AcademicPeriodFormValues,
): Promise<FormActionResult> {
  return mutatePeriod(
    () => updateAcademicPeriod(groupId, periodId, values),
    "period-updated",
  );
}

async function mutatePeriod(
  mutation: () => Promise<PeriodMutationResult>,
  notice: "period-created" | "period-updated",
): Promise<FormActionResult> {
  try {
    const result = await mutation();
    if (result.kind === "overlap") {
      return {
        status: "error",
        formError: `Даты пересекаются с ${formatRelatedPeriods(result.group.periodType, result.periods)}. Измените даты.`,
      };
    }
    invalidateGroup(result.group);
    return {
      status: "success",
      redirectTo: `/groups/${result.group.publicId}/periods/${result.period.publicId}?notice=${notice}`,
    };
  } catch (error) {
    return operationError(error);
  }
}
