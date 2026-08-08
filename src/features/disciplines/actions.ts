"use server";

import { updateTag } from "next/cache";
import { ZodError } from "zod";

import { getAuthorizationErrorMessage } from "@/features/auth/server/authorization";
import type { Discipline } from "@/features/disciplines/domain/disciplines";
import type {
  DisciplineFormValues,
  DisciplineSelectionInput,
} from "@/features/disciplines/schemas";
import {
  addPeriodDisciplines,
  createDiscipline,
  deleteDiscipline,
  getDisciplinesCacheTag,
  removePeriodDiscipline,
  renameDiscipline,
  setDisciplineArchived,
} from "@/features/disciplines/server/operations";
import { DisciplinesServiceError } from "@/features/disciplines/server/errors";
import type { Group } from "@/features/groups/domain/models";
import { logUnexpectedOperationError } from "@/lib/server/log-operation-error";
import { getZodFieldErrors } from "@/lib/zod-errors";

type DisciplineSummary = Pick<Discipline, "publicId" | "name" | "isArchived">;

export type DisciplineActionResult =
  | {
      status: "success";
      redirectTo: string;
      discipline?: DisciplineSummary;
    }
  | {
      status: "error";
      formError: string;
      fieldErrors?: Record<string, string>;
      recovery?: DisciplineSummary;
    };

function invalidateDisciplines(group: Pick<Group, "id" | "publicId">) {
  updateTag(getDisciplinesCacheTag(group.id));
  updateTag(getDisciplinesCacheTag(group.publicId));
}

function actionError(error: unknown): DisciplineActionResult {
  const authorizationMessage = getAuthorizationErrorMessage(error);
  if (authorizationMessage) return { status: "error", formError: authorizationMessage };
  if (error instanceof ZodError) {
    return {
      status: "error",
      formError: "Проверьте заполненные поля.",
      fieldErrors: getZodFieldErrors(error, new Set(["name", "disciplineIds"])),
    };
  }

  if (error instanceof DisciplinesServiceError) {
    if (error.code === "duplicate_archived_name" && error.conflictingDiscipline) {
      return {
        status: "error",
        formError: "Дисциплина с таким названием находится в архиве.",
        fieldErrors: { name: "Восстановите архивную дисциплину вместо создания новой." },
        recovery: error.conflictingDiscipline,
      };
    }
    if (error.code === "duplicate_name") {
      return {
        status: "error",
        formError: "Дисциплина с таким названием уже существует.",
        fieldErrors: { name: "Используйте другое название." },
      };
    }
    if (error.code === "deletion_blocked") {
      return {
        status: "error",
        formError: "Дисциплину нельзя удалить, пока она подключена к учебным периодам или другим данным.",
      };
    }
    if (error.code === "unlink_blocked") {
      return {
        status: "error",
        formError: "Дисциплину нельзя убрать из периода, потому что с этой связью уже есть данные.",
      };
    }
    if (error.code === "archived_not_assignable") {
      return {
        status: "error",
        formError: "Архивную дисциплину нельзя подключить к новому периоду.",
      };
    }
    if (error.code === "already_assigned") {
      return {
        status: "error",
        formError: "Выбранные дисциплины уже подключены к этому периоду.",
      };
    }
    if (
      error.code === "group_not_found" ||
      error.code === "period_not_found" ||
      error.code === "discipline_not_found" ||
      error.code === "assignment_not_found"
    ) {
      return { status: "error", formError: "Запрашиваемые данные не найдены." };
    }
  }

  logUnexpectedOperationError("disciplines", error);
  return {
    status: "error",
    formError: "Не удалось сохранить изменения. Повторите попытку.",
  };
}

export async function createDisciplineAction(
  groupId: string,
  values: DisciplineFormValues,
): Promise<DisciplineActionResult> {
  try {
    const result = await createDiscipline(groupId, values);
    invalidateDisciplines(result.group);
    return {
      status: "success",
      redirectTo: `/groups/${result.group.publicId}/disciplines?notice=discipline-created`,
      discipline: result.discipline,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function renameDisciplineAction(
  groupId: string,
  disciplineId: string,
  values: DisciplineFormValues,
  status: "active" | "archived",
): Promise<DisciplineActionResult> {
  try {
    const result = await renameDiscipline(groupId, disciplineId, values);
    invalidateDisciplines(result.group);
    return {
      status: "success",
      redirectTo: `/groups/${result.group.publicId}/disciplines?status=${status}&notice=discipline-renamed`,
      discipline: result.discipline,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function setDisciplineArchivedAction(
  groupId: string,
  disciplineId: string,
  isArchived: boolean,
): Promise<DisciplineActionResult> {
  try {
    const result = await setDisciplineArchived(groupId, disciplineId, isArchived);
    invalidateDisciplines(result.group);
    const status = isArchived ? "archived" : "active";
    const notice = isArchived ? "discipline-archived" : "discipline-restored";
    return {
      status: "success",
      redirectTo: `/groups/${result.group.publicId}/disciplines?status=${status}&notice=${notice}`,
      discipline: result.discipline,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteDisciplineAction(
  groupId: string,
  disciplineId: string,
  status: "active" | "archived",
): Promise<DisciplineActionResult> {
  try {
    const result = await deleteDiscipline(groupId, disciplineId);
    invalidateDisciplines(result.group);
    return {
      status: "success",
      redirectTo: `/groups/${result.group.publicId}/disciplines?status=${status}&notice=discipline-deleted`,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function addPeriodDisciplinesAction(
  groupId: string,
  periodId: string,
  input: DisciplineSelectionInput,
): Promise<DisciplineActionResult> {
  try {
    const result = await addPeriodDisciplines(groupId, periodId, input);
    invalidateDisciplines(result.group);
    return {
      status: "success",
      redirectTo: `/groups/${result.group.publicId}/periods/${result.period.publicId}?notice=disciplines-added`,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function removePeriodDisciplineAction(
  groupId: string,
  periodId: string,
  disciplineId: string,
): Promise<DisciplineActionResult> {
  try {
    const result = await removePeriodDiscipline(groupId, periodId, disciplineId);
    invalidateDisciplines(result.group);
    return {
      status: "success",
      redirectTo: `/groups/${result.group.publicId}/periods/${result.period.publicId}?notice=discipline-unlinked`,
    };
  } catch (error) {
    return actionError(error);
  }
}
