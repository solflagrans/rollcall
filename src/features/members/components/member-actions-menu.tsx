"use client";

import { Pencil, RotateCcw, Trash2, UserRoundX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  ContextMenu,
  contextMenuItemClassName,
} from "@/components/ui/context-menu";
import {
  deleteMemberAction,
  setMemberActiveAction,
} from "@/features/members/actions";
import { isHeadman, type GroupMember } from "@/features/members/domain/members";
import { formatMemberName } from "@/features/members/presentation/member-copy";
import { cn } from "@/lib/utils";
import { useActionLock } from "@/lib/use-action-lock";

export function MemberActionsMenu({
  groupId,
  member,
  returnTo,
  compact = false,
}: {
  groupId: string;
  returnTo?: string;
  member: Pick<
    GroupMember,
    "publicId" | "firstName" | "lastName" | "role" | "isActive"
  > & { canDelete: boolean };
  compact?: boolean;
}) {
  const router = useRouter();
  const mutation = useActionLock();
  const [error, setError] = useState<string>();
  const [confirmation, setConfirmation] = useState<"deactivate" | "delete">();
  if (isHeadman(member)) return null;

  const memberName = formatMemberName(member);

  const runAction = async (
    action: () => ReturnType<typeof setMemberActiveAction>,
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

  const runConfirmedAction = async () => {
    if (!confirmation) return;
    setError(undefined);
    const result = await mutation.run(() =>
      confirmation === "deactivate"
        ? setMemberActiveAction(groupId, member.publicId, false)
        : deleteMemberAction(
            groupId,
            member.publicId,
            member.isActive ? "active" : "inactive",
          ),
    );
    if (!result) return;
    if (result.status === "success") {
      setConfirmation(undefined);
      router.push(result.redirectTo);
      return;
    }
    setError(result.formError);
  };

  return (
    <>
      <ContextMenu label={`Действия: ${memberName}`} compact={compact}>
        {(close) => (
          <>
            <Link
              role="menuitem"
              href={`/groups/${groupId}/members/${member.publicId}/edit${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
              className={contextMenuItemClassName}
              onClick={close}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Изменить
            </Link>

            {member.isActive ? (
            <button
              type="button"
              role="menuitem"
              className={contextMenuItemClassName}
              disabled={mutation.isLocked}
              onClick={() => {
                close();
                setError(undefined);
                setConfirmation("deactivate");
              }}
            >
              <UserRoundX aria-hidden="true" className="size-4" />
              Деактивировать
            </button>
            ) : (
            <button
              type="button"
              role="menuitem"
              className={contextMenuItemClassName}
              disabled={mutation.isLocked}
              onClick={() =>
                void runAction(
                  () => setMemberActiveAction(groupId, member.publicId, true),
                  close,
                )
              }
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Вернуть в активные
            </button>
            )}

            {member.canDelete ? (
              <button
                type="button"
                role="menuitem"
                className={cn(
                  contextMenuItemClassName,
                  "text-destructive hover:text-destructive",
                )}
                disabled={mutation.isLocked}
                onClick={() => {
                  close();
                  setError(undefined);
                  setConfirmation("delete");
                }}
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Удалить запись
              </button>
            ) : null}

            {error ? (
              <p role="alert" className="max-w-64 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </>
        )}
      </ContextMenu>

      <ConfirmationDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmation(undefined);
            setError(undefined);
          }
        }}
        title={
          confirmation === "delete"
            ? `Удалить «${memberName}»?`
            : `Деактивировать «${memberName}»?`
        }
        description={
          confirmation === "delete"
            ? "Удаление предназначено только для ошибочно созданной записи."
            : "Участник перейдёт в неактивный состав, а его история сохранится."
        }
        confirmLabel={confirmation === "delete" ? "Удалить запись" : "Деактивировать"}
        pendingLabel={confirmation === "delete" ? "Удаление…" : "Деактивация…"}
        pending={mutation.isLocked}
        destructive={confirmation === "delete"}
        error={error}
        onConfirm={runConfirmedAction}
      >
        {confirmation === "delete"
          ? "Это действие нельзя отменить."
          : "При необходимости участника можно будет вернуть в активный состав."}
      </ConfirmationDialog>
    </>
  );
}
