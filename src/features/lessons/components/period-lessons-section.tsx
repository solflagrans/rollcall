import { BookOpenCheck, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function PeriodLessonsSection({
  groupId,
  periodId,
  hasDisciplines,
}: {
  groupId: string;
  periodId: string;
  hasDisciplines: boolean;
}) {
  const periodHref = `/groups/${groupId}/periods/${periodId}`;

  return (
    <section data-surface="subtle" className="rounded-md bg-surface-subtle p-6 sm:p-8">
      <BookOpenCheck aria-hidden="true" className="size-8 text-muted-foreground" />
      <h2 className="mt-4 font-heading text-xl font-semibold">Занятия</h2>
      {hasDisciplines ? (
        <>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Создайте занятие и сразу зафиксируйте посещаемость текущего состава группы.
          </p>
          <Button asChild className="mt-5">
            <Link href={`${periodHref}/lessons/new`}>
              <Plus aria-hidden="true" />
              Создать занятие
            </Link>
          </Button>
        </>
      ) : (
        <>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Для создания занятия сначала подключите к периоду хотя бы одну дисциплину.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link href={`${periodHref}?add-disciplines=1#period-disciplines-title`}>
              Добавить дисциплины
            </Link>
          </Button>
        </>
      )}
    </section>
  );
}
