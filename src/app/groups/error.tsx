"use client";

import { ErrorState } from "@/components/error-state";

export default function GroupsError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="Не удалось загрузить данные" reset={reset} />;
}
