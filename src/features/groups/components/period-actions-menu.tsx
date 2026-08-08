"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";

import {
  ContextMenu,
  contextMenuItemClassName,
} from "@/components/ui/context-menu";
import {
  type PeriodType,
} from "@/features/groups/domain/periods";
import {
  formatPeriodName,
  periodTypeCopy,
} from "@/features/groups/presentation/period-copy";

export function PeriodActionsMenu({
  groupId,
  periodId,
  periodType,
  periodNumber,
}: {
  groupId: string;
  periodId: string;
  periodType: PeriodType;
  periodNumber: number;
}) {
  const periodName = formatPeriodName(periodType, periodNumber);
  const editAction = periodTypeCopy[periodType].editAction;

  return (
    <ContextMenu label={`Действия: ${periodName}`}>
      {(close) => (
          <Link
            role="menuitem"
            href={`/groups/${groupId}/periods/${periodId}/edit`}
            className={contextMenuItemClassName}
            onClick={close}
          >
            <Pencil aria-hidden="true" className="size-4" />
            {editAction}
          </Link>
      )}
    </ContextMenu>
  );
}
