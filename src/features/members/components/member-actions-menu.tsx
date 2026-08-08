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

export function MemberActionsMenu({
  groupId,
  member,
  compact = false,
}: {
  groupId: string;
  member: GroupMember;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  if (isHeadman(member)) return null;

  const memberName = formatMemberName(member);

  const runAction = async (
    action: () => ReturnType<typeof setMemberActiveAction>,
    close: () => void,
  ) => {
    if (pending) return;
    setPending(true);
    setError(undefined);
    const result = await action();
    if (result.status === "success") {
      setPending(false);
      close();
      router.push(result.redirectTo);
      router.refresh();
      return;
    }
    setError(result.formError);
    setPending(false);
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
              disabled={pending}
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
              disabled={pending}
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

          <button
            type="button"
            role="menuitem"
            className={cn(contextMenuItemClassName, "text-destructive hover:text-destructive")}
            disabled={pending}
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
          </button>

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
