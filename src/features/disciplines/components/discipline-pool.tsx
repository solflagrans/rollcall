import Link from "next/link";

import { DisciplineActionsMenu } from "@/features/disciplines/components/discipline-actions-menu";
import { NewDisciplineDialog } from "@/features/disciplines/components/new-discipline-dialog";
import type {
  Discipline,
  DisciplineListStatus,
} from "@/features/disciplines/domain/disciplines";
import { cn } from "@/lib/utils";

export function DisciplinePool({
  groupId,
  disciplines,
  status,
}: {
  groupId: string;
  disciplines: Discipline[];
  status: DisciplineListStatus;
}) {
  const activeCount = disciplines.filter(({ isArchived }) => !isArchived).length;
  const archivedCount = disciplines.length - activeCount;
  const visible = disciplines.filter(
    ({ isArchived }) => isArchived === (status === "archived"),
  );

  return (
    <section className="space-y-5" aria-label="Общий пул дисциплин">
      <nav aria-label="Статус дисциплин" className="flex gap-2">
        {(["active", "archived"] as const).map((item) => {
          const selected = item === status;
          const count = item === "active" ? activeCount : archivedCount;
          return (
            <Link
              key={item}
              href={`/groups/${groupId}/disciplines${item === "archived" ? "?status=archived" : ""}`}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 items-center rounded-sm border px-3 text-sm font-medium transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                selected
                  ? "border-primary bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item === "active" ? "Активные" : "Архив"} · {count}
            </Link>
          );
        })}
      </nav>

      {visible.length > 0 ? (
        <div className="overflow-visible rounded-md border bg-card">
          {visible.map((discipline) => (
            <div
              key={discipline.publicId}
              className="flex min-h-14 items-center gap-4 border-b px-4 py-2 last:border-b-0"
            >
              <p className="min-w-0 flex-1 truncate font-medium">{discipline.name}</p>
              <DisciplineActionsMenu groupId={groupId} discipline={discipline} />
            </div>
          ))}
        </div>
      ) : status === "archived" ? (
        <div className="rounded-md border border-dashed bg-surface-subtle p-6 text-sm text-muted-foreground">
          Архив дисциплин пока пуст.
        </div>
      ) : disciplines.length === 0 ? (
        <div className="rounded-md border border-dashed bg-surface-subtle p-6 sm:p-8">
          <h3 className="font-heading text-lg font-semibold">Создайте первую дисциплину</h3>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Она войдёт в постоянный пул группы и будет доступна для подключения к учебным периодам.
          </p>
          <div className="mt-5">
            <NewDisciplineDialog groupId={groupId} label="Создать дисциплину" />
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed bg-surface-subtle p-6 text-sm text-muted-foreground">
          Активных дисциплин пока нет.
        </div>
      )}
    </section>
  );
}
