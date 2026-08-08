import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { PeriodType } from "@/features/groups/domain/periods";
import { periodTypeCopy } from "@/features/groups/presentation/period-copy";

export function NewPeriodAction({
  groupId,
  periodType,
  prominent = false,
  secondary = false,
}: {
  groupId: string;
  periodType: PeriodType;
  prominent?: boolean;
  secondary?: boolean;
}) {
  const label = periodTypeCopy[periodType].newAction;
  const href = `/groups/${groupId}/periods/new`;

  return (
    <>
      <Button
        asChild
        size={prominent ? "lg" : "default"}
        variant={secondary ? "outline" : "default"}
        className="hidden sm:inline-flex"
      >
        <Link href={href}>{label}</Link>
      </Button>
      <Button
        asChild
        size="icon"
        variant={secondary ? "outline" : "default"}
        className="sm:hidden"
        aria-label={label}
      >
        <Link href={href}>
          <Plus aria-hidden="true" />
        </Link>
      </Button>
    </>
  );
}
