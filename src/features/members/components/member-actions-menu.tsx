"use client";

import { Pencil, RotateCcw, Trash2, UserRoundX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
  compact = false,
}: {
  groupId: string;
  member: Pick<
    GroupMember,
    "publicId" | "firstName" | "lastName" | "role" | "isActive"
  > & { canDelete: boolean };
  compact?: boolean;
}) {
  const router = useRouter();
  const mutation = useActionLock();
  const [error, setError] = useState<string>();
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

  return (
    <ContextMenu label={`Действия: ${memberName}`} compact={compact}>
      {(close) => (
        <>
          <Link
            role="menuitem"
            href={`/groups/${groupId}/members/${member.publicId}/edit`}
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
                if (!window.confirm(`Деактивировать участника «${memberName}»?`)) return;
                void runAction(
                  () => setMemberActiveAction(groupId, member.publicId, false),
                  close,
                );
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

          {member.canDelete ? <button
            type="button"
            role="menuitem"
            className={cn(contextMenuItemClassName, "text-destructive hover:text-destructive")}
            disabled={mutation.isLocked}
            onClick={() => {
              if (!window.confirm(`Удалить ошибочную запись «${memberName}» без возможности восстановления?`)) return;
              void runAction(
                () =>
                  deleteMemberAction(
                    groupId,
                    member.publicId,
                    member.isActive ? "active" : "inactive",
                  ),
                close,
              );
            }}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Удалить запись
          </button> : null}

          {error ? (
            <p role="alert" className="max-w-64 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </>
      )}
    </ContextMenu>
  );
}
