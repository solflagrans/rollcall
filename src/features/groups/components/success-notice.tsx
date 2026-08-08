import { ToastNotice } from "@/components/toast-notice";
import type { PeriodType } from "@/features/groups/domain/periods";
import { periodTypeCopy } from "@/features/groups/presentation/period-copy";

const messages = {
  "group-created": "Группа создана",
  "group-updated": "Группа обновлена",
  "period-created": "Учебный период создан",
  "period-updated": "Учебный период обновлён",
  "lesson-created": "Занятие сохранено",
  "group-not-found": "Группа не найдена. Создайте новую группу.",
  "period-not-found": "Период не найден. Открыта страница группы.",
} as const;

const warningNotices = new Set<NoticeKind>(["group-not-found", "period-not-found"]);

export type NoticeKind = keyof typeof messages;

export function SuccessNotice({
  notice,
  periodType,
}: {
  notice?: string;
  periodType?: PeriodType;
}) {
  if (!notice || !(notice in messages)) return null;
  const noticeKind = notice as NoticeKind;
  const warning = warningNotices.has(noticeKind);
  let message: string = messages[noticeKind];
  if (periodType && noticeKind === "period-created") {
    message = periodTypeCopy[periodType].createdNotice;
  } else if (periodType && noticeKind === "period-updated") {
    message = periodTypeCopy[periodType].updatedNotice;
  } else if (periodType && noticeKind === "period-not-found") {
    message = periodTypeCopy[periodType].notFoundNotice;
  }

  return (
    <ToastNotice
      key={noticeKind}
      message={message}
      tone={warning ? "warning" : "success"}
    />
  );
}
