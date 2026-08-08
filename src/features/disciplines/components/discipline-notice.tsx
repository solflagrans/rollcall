import { ToastNotice } from "@/components/toast-notice";

const messages = {
  "discipline-created": "Дисциплина создана",
  "discipline-renamed": "Название дисциплины обновлено",
  "discipline-archived": "Дисциплина перемещена в архив",
  "discipline-restored": "Дисциплина восстановлена",
  "discipline-deleted": "Ошибочная дисциплина удалена",
  "disciplines-added": "Дисциплины добавлены в учебный период",
  "discipline-unlinked": "Дисциплина убрана из учебного периода",
} as const;

export function DisciplineNotice({ notice }: { notice?: string }) {
  if (!notice || !(notice in messages)) return null;
  return (
    <ToastNotice
      key={notice}
      message={messages[notice as keyof typeof messages]}
    />
  );
}
