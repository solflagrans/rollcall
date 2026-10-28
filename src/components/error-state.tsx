"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ErrorState({
  title,
  reset,
  centered = false,
}: {
  title: string;
  reset: () => void;
  centered?: boolean;
}) {
  return (
    <div
      data-surface="raised"
      className={cn(
        "rounded-md border bg-card p-6 shadow-xs sm:p-8",
        centered && "mx-auto max-w-lg text-center",
      )}
    >
      <AlertCircle
        aria-hidden="true"
        className={cn("size-8 text-destructive", centered && "mx-auto")}
      />
      <h1 className="mt-4 font-heading text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted-foreground">
        Проверьте интернет-соединение и повторите попытку. Введённые данные не были отправлены повторно.
      </p>
      <Button type="button" className="mt-6" onClick={reset}>
        Повторить
      </Button>
    </div>
  );
}
