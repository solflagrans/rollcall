"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="app-container flex min-h-dvh items-center py-12">
      <div className="mx-auto max-w-lg rounded-md border bg-card p-6 text-center sm:p-8">
        <AlertCircle aria-hidden="true" className="mx-auto size-8 text-destructive" />
        <h1 className="mt-4 font-heading text-xl font-semibold">Не удалось открыть Rollcall</h1>
        <p className="mt-2 text-muted-foreground">
          Проверьте подключение к базе данных и повторите попытку.
        </p>
        <Button type="button" className="mt-6" onClick={reset}>
          Повторить
        </Button>
      </div>
    </main>
  );
}
