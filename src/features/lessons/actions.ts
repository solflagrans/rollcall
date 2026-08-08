"use server";

import { ZodError } from "zod";

import { formatCalendarDate } from "@/features/groups/presentation/period-copy";
import type { LessonFormValues } from "@/features/lessons/schemas";
import { createLesson } from "@/features/lessons/server/operations";
import { LessonsServiceError } from "@/features/lessons/server/errors";
import type { FormActionResult } from "@/lib/form-action";
import { logUnexpectedOperationError } from "@/lib/server/log-operation-error";
import { getZodFieldErrors } from "@/lib/zod-errors";

function actionError(error: unknown): FormActionResult {
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
    if (error.code === "group_not_found" || error.code === "period_not_found") {
      return { status: "error", formError: "Запрашиваемые данные не найдены." };
    }
  }

  logUnexpectedOperationError("lessons", error);
  return {
    status: "error",
    formError: "Не удалось сохранить занятие. Повторите попытку.",
  };
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
