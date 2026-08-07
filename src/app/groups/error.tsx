"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GroupsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-md border bg-card p-6 sm:p-8">
      <AlertCircle aria-hidden="true" className="size-8 text-destructive" />
      <h1 className="mt-4 font-heading text-xl font-semibold">Не удалось загрузить данные</h1>
      <p className="mt-2 text-muted-foreground">
        Проверьте подключение к базе данных и повторите попытку.
      </p>
      <Button type="button" className="mt-6" onClick={reset}>
        Повторить
      </Button>
    </div>
  );
}
