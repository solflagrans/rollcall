"use server";

import { ZodError } from "zod";

import { getAuthorizationErrorMessage } from "@/features/auth/server/authorization";
import { formatCalendarDate } from "@/features/groups/presentation/period-copy";
import type {
  LessonFormValues,
  UpdateLessonAttendanceInput,
  UpdateLessonInput,
} from "@/features/lessons/schemas";
import {
  createLesson,
  deleteLesson,
  updateLesson,
  updateLessonAttendance,
} from "@/features/lessons/server/operations";
import { LessonsServiceError } from "@/features/lessons/server/errors";
import type { FormActionResult } from "@/lib/form-action";
import { logUnexpectedOperationError } from "@/lib/server/log-operation-error";
import { getZodFieldErrors } from "@/lib/zod-errors";

function actionError(error: unknown): FormActionResult {
  const authorizationMessage = getAuthorizationErrorMessage(error);
  if (authorizationMessage) return { status: "error", formError: authorizationMessage };
  if (error instanceof ZodError) {
    return {
      status: "error",
      formError: "Проверьте заполненные поля.",
      fieldErrors: getZodFieldErrors(
        error,
        new Set(["lessonDate", "disciplineId", "lessonType", "attendance"]),
      ),
    };
  }

  if (error instanceof LessonsServiceError) {
    if (error.code === "date_outside_period") {
      return {
        status: "error",
        formError: "Дата занятия должна находиться внутри выбранного учебного периода.",
        fieldErrors: {
          lessonDate: error.details
            ? `Допустимый диапазон: ${formatCalendarDate(error.details.startsOn)} — ${formatCalendarDate(error.details.endsOn)}`
            : "Выберите дату внутри учебного периода.",
        },
      };
    }
    if (error.code === "discipline_not_assigned") {
      return {
        status: "error",
        formError: "Выбранная дисциплина больше не подключена к этому периоду.",
        fieldErrors: { disciplineId: "Выберите доступную дисциплину." },
      };
    }
    if (error.code === "context_changed") {
      return {
        status: "error",
        formError: "Состав группы или дисциплины изменились. Обновите страницу и повторите попытку.",
      };
    }
    if (
      error.code === "group_not_found" ||
      error.code === "period_not_found" ||
      error.code === "lesson_not_found"
    ) {
      return { status: "error", formError: "Запрашиваемые данные не найдены." };
    }
  }

  logUnexpectedOperationError("lessons", error);
  return {
    status: "error",
    formError: "Не удалось сохранить занятие. Повторите попытку.",
  };
}

export async function updateLessonAttendanceAction(
  groupId: string,
  periodId: string,
  lessonId: string,
  values: UpdateLessonAttendanceInput,
): Promise<FormActionResult> {
  try {
    const result = await updateLessonAttendance(
      groupId,
      periodId,
      lessonId,
      values,
    );
    return {
      status: "success",
      redirectTo: `/groups/${result.group.publicId}/periods/${result.period.publicId}?notice=attendance-updated`,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateLessonAction(
  groupId: string,
  periodId: string,
  lessonId: string,
  values: UpdateLessonInput,
): Promise<FormActionResult> {
  try {
    const result = await updateLesson(groupId, periodId, lessonId, values);
    return {
      status: "success",
      redirectTo: `/groups/${result.group.publicId}/periods/${result.period.publicId}/lessons/${result.lesson.publicId}?notice=lesson-updated`,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteLessonAction(
  groupId: string,
  periodId: string,
  lessonId: string,
): Promise<FormActionResult> {
  try {
    const result = await deleteLesson(groupId, periodId, lessonId);
    return {
      status: "success",
      redirectTo: `/groups/${result.group.publicId}/periods/${result.period.publicId}?notice=lesson-deleted`,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function createLessonAction(
  groupId: string,
  periodId: string,
  values: LessonFormValues,
): Promise<FormActionResult> {
  try {
    const result = await createLesson(groupId, periodId, values);
    return {
      status: "success",
      redirectTo: `/groups/${result.group.publicId}/periods/${result.period.publicId}?notice=lesson-created`,
    };
  } catch (error) {
    return actionError(error);
  }
}
