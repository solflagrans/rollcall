import Link from "next/link";

import { LinkPendingIndicator } from "@/components/link-pending-indicator";
import { HorizontalScrollArea } from "@/components/ui/horizontal-scroll-area";
import {
  type PeriodType,
} from "@/features/groups/domain/periods";
import {
  formatPeriodName,
  periodTypeCopy,
} from "@/features/groups/presentation/period-copy";
import { cn } from "@/lib/utils";

interface PeriodNavigationItem {
  publicId: string;
  number: number;
}

export function PeriodSwitcher({
  groupId,
  periodType,
  periods,
  selectedPeriodId,
  getPeriodHref,
}: {
  groupId: string;
  periodType: PeriodType;
  periods: PeriodNavigationItem[];
  selectedPeriodId: string;
  getPeriodHref?: (period: PeriodNavigationItem) => string;
}) {
  return (
    <nav
      aria-label={periodTypeCopy[periodType].plural}
      className="min-w-0"
    >
      <HorizontalScrollArea viewportClassName="pb-1">
        <div className="flex min-w-max items-center gap-2">
          {periods.map((period) => {
            const selected = period.publicId === selectedPeriodId;
            return (
              <Link
                key={period.publicId}
                href={
                  getPeriodHref?.(period) ??
                  `/groups/${groupId}/periods/${period.publicId}`
                }
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-sm border px-4 text-sm font-medium transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected
                    ? "border-primary bg-accent text-accent-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {formatPeriodName(periodType, period.number)}
                <LinkPendingIndicator />
              </Link>
            );
          })}
        </div>
      </HorizontalScrollArea>
    </nav>
  );
}
