import { CircleCheck, CircleHelp, Clock3, XCircle } from "lucide-react";
import { statusMeta, type AttendanceStatus } from "@/lib/constants";

const icons = { present: CircleCheck, absent: XCircle, late: Clock3, excused: CircleHelp };

export function StatusBadge({ status, compact = false }: { status: AttendanceStatus; compact?: boolean }) {
  const Icon = icons[status];
  return <span className={`status status-${status}`} title={statusMeta[status].label}><Icon size={14} aria-hidden />{compact ? statusMeta[status].short : statusMeta[status].label}</span>;
}
