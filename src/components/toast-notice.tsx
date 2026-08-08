"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function ToastNotice({
  message,
  tone = "success",
}: {
  message?: string;
  tone?: "success" | "warning";
}) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!visible) return;
    const timeout = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [visible]);

  if (!visible || !message) return null;
  const warning = tone === "warning";
  const Icon = warning ? AlertTriangle : CheckCircle2;

  return (
    <div
      role={warning ? "alert" : "status"}
      className="fixed top-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-md border bg-card p-3 shadow-sm"
    >
      <Icon
        aria-hidden="true"
        className={warning ? "size-5 text-status-late-foreground" : "size-5 text-status-present"}
      />
      <span className="text-sm font-medium">{message}</span>
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
