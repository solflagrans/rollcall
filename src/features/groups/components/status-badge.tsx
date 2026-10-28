import { cn } from "@/lib/utils";
import { type PeriodStatus } from "@/features/groups/domain/periods";
import { periodStatusLabels } from "@/features/groups/presentation/period-copy";

const statusClasses: Record<PeriodStatus, string> = {
  current: "border-primary/30 bg-accent text-accent-foreground",
  upcoming: "border-border-strong bg-secondary text-secondary-foreground",
  completed: "border-border-strong bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: PeriodStatus }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-medium",
        statusClasses[status],
      )}
    >
      {periodStatusLabels[status]}
    </span>
  );
}
