"use client";

import { Archive, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Dialog } from "@/components/ui/dialog";
import {
  ContextMenu,
  contextMenuItemClassName,
} from "@/components/ui/context-menu";
import {
  deleteDisciplineAction,
  setDisciplineArchivedAction,
  type DisciplineActionResult,
} from "@/features/disciplines/actions";
import { DisciplineNameForm } from "@/features/disciplines/components/discipline-name-form";
import type { Discipline } from "@/features/disciplines/domain/disciplines";
import { cn } from "@/lib/utils";
import { useActionLock } from "@/lib/use-action-lock";

export function DisciplineActionsMenu({
  groupId,
  discipline,
}: {
  groupId: string;
  discipline: Discipline;
}) {
  const router = useRouter();
  const mutation = useActionLock();
  const [renameOpen, setRenameOpen] = useState(false);
  const [error, setError] = useState<string>();
  const status = discipline.isArchived ? "archived" : "active";

  const runAction = async (
    action: () => Promise<DisciplineActionResult>,
    close: () => void,
  ) => {
    setError(undefined);
    const result = await mutation.run(action);
    if (!result) return;
    if (result.status === "success") {
      close();
      router.push(result.redirectTo);
      return;
    }
    setError(result.formError);
  };

  return (
    <>
      <ContextMenu label={`Действия: ${discipline.name}`} compact>
        {(close) => (
          <>
            <button
              type="button"
              role="menuitem"
              className={contextMenuItemClassName}
              onClick={() => {
                close();
                setRenameOpen(true);
              }}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Переименовать
            </button>

            <button
              type="button"
              role="menuitem"
              className={contextMenuItemClassName}
              disabled={mutation.isLocked}
              onClick={() =>
                void runAction(
                  () =>
                    setDisciplineArchivedAction(
                      groupId,
                      discipline.publicId,
                      !discipline.isArchived,
                    ),
                  close,
                )
              }
            >
              {discipline.isArchived ? (
                <RotateCcw aria-hidden="true" className="size-4" />
              ) : (
                <Archive aria-hidden="true" className="size-4" />
              )}
              {discipline.isArchived ? "Восстановить" : "Архивировать"}
            </button>

            <button
              type="button"
              role="menuitem"
              className={cn(
                contextMenuItemClassName,
                "text-destructive hover:text-destructive",
              )}
              disabled={mutation.isLocked}
              onClick={() => {
                if (
                  !window.confirm(
                    `Удалить ошибочно созданную дисциплину «${discipline.name}» без возможности восстановления?`,
                  )
                ) {
                  return;
                }
                void runAction(
                  () =>
                    deleteDisciplineAction(
                      groupId,
                      discipline.publicId,
                      status,
                    ),
                  close,
                );
              }}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Удалить запись
            </button>

            {error ? (
              <p role="alert" className="max-w-72 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </>
        )}
      </ContextMenu>

      <Dialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title={`Переименовать «${discipline.name}»`}
        description="Новое название обновится во всех учебных периодах."
      >
        <DisciplineNameForm
          groupId={groupId}
          discipline={discipline}
          listStatus={status}
          onSuccess={() => setRenameOpen(false)}
          onCancel={() => setRenameOpen(false)}
        />
      </Dialog>
    </>
  );
}
