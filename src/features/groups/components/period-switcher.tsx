import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatPeriodName, type PeriodType } from "@/features/groups/domain/periods";
import { cn } from "@/lib/utils";
import type { AcademicPeriodRecord } from "@/server/db/schema";

export function PeriodSwitcher({
  groupId,
  periodType,
  periods,
  selectedPeriodId,
}: {
  groupId: string;
  periodType: PeriodType;
  periods: AcademicPeriodRecord[];
  selectedPeriodId: string;
}) {
  return (
    <nav aria-label="Учебные периоды" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max items-center gap-2 pb-1">
        {periods.map((period) => {
          const selected = period.id === selectedPeriodId;
          return (
            <Link
              key={period.id}
              href={`/groups/${groupId}/periods/${period.id}`}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "flex h-11 items-center rounded-sm border px-4 text-sm font-medium transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                selected
                  ? "border-primary bg-accent text-accent-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {formatPeriodName(periodType, period.number)}
            </Link>
          );
        })}
        <Button asChild variant="outline" size="icon" aria-label="Создать период">
          <Link href={`/groups/${groupId}/periods/new`}>
            <Plus aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </nav>
  );
}
