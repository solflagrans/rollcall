import { ToastNotice } from "@/components/toast-notice";

const messages = {
  "member-created": "Участник добавлен",
  "member-updated": "Данные участника обновлены",
  "member-deactivated": "Участник перенесён в неактивный состав",
  "member-reactivated": "Участник возвращён в активный состав",
  "member-deleted": "Ошибочная запись удалена",
  "member-not-found": "Участник не найден. Открыт состав группы.",
  "headman-protected": "Имя и фамилия старосты синхронизируются с профилем аккаунта.",
} as const;

export function MemberNotice({ notice }: { notice?: string }) {
  if (!notice || !(notice in messages)) return null;
  const warning = notice === "member-not-found" || notice === "headman-protected";
  return (
    <ToastNotice
      key={notice}
      message={messages[notice as keyof typeof messages]}
      tone={warning ? "warning" : "success"}
    />
  );
}
