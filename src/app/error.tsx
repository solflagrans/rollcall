"use client";

import { ErrorState } from "@/components/error-state";

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="app-container flex min-h-dvh items-center py-12">
      <ErrorState title="Не удалось открыть Rollcall" reset={reset} centered />
    </main>
  );
}
