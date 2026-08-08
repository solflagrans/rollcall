"use client";

import { BookOpenText, Plus, Unlink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  addPeriodDisciplinesAction,
  removePeriodDisciplineAction,
} from "@/features/disciplines/actions";
import { DisciplineNameForm } from "@/features/disciplines/components/discipline-name-form";
import type { Discipline } from "@/features/disciplines/domain/disciplines";

type DisciplineSummary = Pick<
  Discipline,
  "publicId" | "name" | "isArchived"
>;

const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });

export function PeriodDisciplinesSection({
  groupId,
  periodId,
  disciplines,
  assignedDisciplines,
  openOnLoad = false,
}: {
  groupId: string;
  periodId: string;
  disciplines: DisciplineSummary[];
  assignedDisciplines: DisciplineSummary[];
  openOnLoad?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(openOnLoad);
  const [creating, setCreating] = useState(false);
  const [pool, setPool] = useState(disciplines);
  const [selectedIds, setSelectedIds] = useState(() => new Set<string>());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const assignedIds = useMemo(
    () => new Set(assignedDisciplines.map(({ publicId }) => publicId)),
    [assignedDisciplines],
  );
  const available = pool
    .filter(
      (discipline) =>
        !discipline.isArchived && !assignedIds.has(discipline.publicId),
    )
    .toSorted((left, right) => collator.compare(left.name, right.name));

  const addSelected = async () => {
    if (selectedIds.size === 0 || pending) return;
    setPending(true);
    setError(undefined);
    const result = await addPeriodDisciplinesAction(groupId, periodId, {
      disciplineIds: [...selectedIds],
    });
    setPending(false);
    if (result.status === "success") {
      setOpen(false);
      setCreating(false);
      setSelectedIds(new Set());
      router.push(result.redirectTo);
      router.refresh();
      return;
    }
    setError(result.formError);
  };

  const remove = async (discipline: DisciplineSummary) => {
    if (pending) return;
    if (!window.confirm(`Убрать дисциплину «${discipline.name}» из этого учебного периода?`)) {
      return;
    }
    setPending(true);
    setError(undefined);
    const result = await removePeriodDisciplineAction(
      groupId,
      periodId,
      discipline.publicId,
    );
    setPending(false);
    if (result.status === "success") {
      router.push(result.redirectTo);
      router.refresh();
      return;
    }
    setError(result.formError);
  };

  const makeAvailable = (discipline: DisciplineSummary) => {
    const restored = { ...discipline, isArchived: false };
    setPool((current) => {
      const exists = current.some(
        (candidate) => candidate.publicId === restored.publicId,
      );
      return exists
        ? current.map((candidate) =>
            candidate.publicId === restored.publicId ? restored : candidate,
          )
        : [...current, restored];
    });
    setSelectedIds((current) => new Set(current).add(restored.publicId));
    setCreating(false);
    setError(undefined);
  };

  return (
    <section className="space-y-4" aria-labelledby="period-disciplines-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="period-disciplines-title" className="font-heading text-xl font-semibold">
            Дисциплины
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {assignedDisciplines.length} {disciplineCountLabel(assignedDisciplines.length)}
          </p>
        </div>
        {assignedDisciplines.length > 0 ? (
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            <Plus aria-hidden="true" />
            Добавить дисциплины
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-sm border border-destructive/40 bg-status-absent-background p-3 text-sm text-status-absent-foreground">
          {error}
        </p>
      ) : null}

      {assignedDisciplines.length > 0 ? (
        <div className="rounded-md border bg-card">
          {assignedDisciplines.map((discipline) => (
            <div
              key={discipline.publicId}
              className="flex min-h-14 items-center gap-3 border-b px-4 py-2 last:border-b-0"
            >
              <BookOpenText aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
              <p className="min-w-0 flex-1 font-medium">{discipline.name}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                aria-label={`Убрать из периода: ${discipline.name}`}
                onClick={() => void remove(discipline)}
              >
                <Unlink aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed bg-surface-subtle p-6 sm:p-8">
          <BookOpenText aria-hidden="true" className="size-8 text-muted-foreground" />
          <h3 className="mt-4 font-heading text-lg font-semibold">
            В этом периоде пока нет дисциплин
          </h3>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Добавьте дисциплины из общего пула или создайте первую прямо здесь.
          </p>
          <Button type="button" className="mt-5" onClick={() => setOpen(true)}>
            <Plus aria-hidden="true" />
            Добавить дисциплины
          </Button>
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setCreating(false);
            setError(undefined);
          }
        }}
        title="Добавить дисциплины"
        description="Выберите одну или несколько дисциплин из активного пула группы."
        className="max-w-xl"
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Доступные дисциплины</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setCreating((current) => !current)}
            >
              <Plus aria-hidden="true" />
              Новая дисциплина
            </Button>
          </div>

          {creating ? (
            <div className="rounded-md border bg-surface-subtle p-4">
              <DisciplineNameForm
                groupId={groupId}
                onSuccess={makeAvailable}
                stayOnPage
                onCancel={() => setCreating(false)}
              />
            </div>
          ) : null}

          {available.length > 0 ? (
            <fieldset className="space-y-2">
              <legend className="sr-only">Выберите дисциплины</legend>
              {available.map((discipline) => (
                <label
                  key={discipline.publicId}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border px-3 py-2 hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={selectedIds.has(discipline.publicId)}
                    onChange={(event) => {
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(discipline.publicId);
                        else next.delete(discipline.publicId);
                        return next;
                      });
                    }}
                  />
                  <span className="font-medium">{discipline.name}</span>
                </label>
              ))}
            </fieldset>
          ) : (
            <p className="rounded-sm border border-dashed bg-surface-subtle p-4 text-sm text-muted-foreground">
              {pool.some(({ isArchived }) => !isArchived)
                ? "Все активные дисциплины уже подключены к этому периоду."
                : "В активном пуле пока нет дисциплин. Создайте первую выше."}
            </p>
          )}

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              type="button"
              disabled={selectedIds.size === 0 || pending}
              onClick={() => void addSelected()}
            >
              {pending ? "Добавление…" : "Добавить выбранные"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}

function disciplineCountLabel(count: number): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return "дисциплин";
  if (mod10 === 1) return "дисциплина";
  if (mod10 >= 2 && mod10 <= 4) return "дисциплины";
  return "дисциплин";
}
