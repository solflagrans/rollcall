import type { GroupMemberRole } from "@/features/members/domain/members";
import { memberRoleLabels } from "@/features/members/presentation/member-copy";
import { cn } from "@/lib/utils";

const roleClasses: Record<GroupMemberRole, string> = {
  headman: "border-primary/30 bg-accent text-accent-foreground",
  deputy: "border-status-excused-border bg-status-excused-background text-status-excused-foreground",
  student: "border-border-strong bg-muted text-muted-foreground",
};

export function MemberRoleBadge({ role }: { role: GroupMemberRole }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-medium",
        roleClasses[role],
      )}
    >
      {memberRoleLabels[role]}
    </span>
  );
}
