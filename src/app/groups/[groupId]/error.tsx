"use client";

import { ErrorState } from "@/components/error-state";

export default function GroupError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="Не удалось загрузить раздел группы" reset={reset} />;
}
