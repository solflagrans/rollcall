import { cn } from "@/lib/utils";
import {
  periodStatusLabels,
  type PeriodStatus,
} from "@/features/groups/domain/periods";

const statusClasses: Record<PeriodStatus, string> = {
  current: "border-primary/30 bg-accent text-accent-foreground",
  upcoming: "border-status-late-border bg-status-late-background text-status-late-foreground",
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
