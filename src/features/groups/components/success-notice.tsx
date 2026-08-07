"use client";

import { CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const messages = {
  "group-created": "Группа создана",
  "group-updated": "Группа обновлена",
  "period-created": "Период создан",
  "period-updated": "Период обновлён",
} as const;

export type NoticeKind = keyof typeof messages;

export function SuccessNotice({ notice }: { notice?: string }) {
  const [visible, setVisible] = useState(Boolean(notice && notice in messages));

  useEffect(() => {
    if (!visible) return;
    const timeout = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [visible]);

  if (!visible || !notice || !(notice in messages)) return null;

  return (
    <div
      role="status"
      className="fixed top-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-md border bg-card p-3 shadow-sm"
    >
      <CheckCircle2 aria-hidden="true" className="size-5 text-status-present" />
      <span className="text-sm font-medium">{messages[notice as NoticeKind]}</span>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Закрыть уведомление"
        onClick={() => setVisible(false)}
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  );
}
