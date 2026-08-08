import { attendanceStatuses, type AttendanceStatus } from "@/features/lessons/domain/lessons";
import { attendanceStatusCopy } from "@/features/lessons/presentation/lesson-copy";
import { cn } from "@/lib/utils";

type AttendanceCounts = Record<AttendanceStatus, number>;

export function AttendanceStatusDistribution({
  counts,
}: {
  counts: AttendanceCounts;
}) {
  const distributionLabel = attendanceStatuses
    .map((status) => `${attendanceStatusCopy[status]}: ${counts[status]}`)
    .join(", ");

  return (
    <div
      role="img"
      aria-label={`Распределение посещаемости. ${distributionLabel}`}
      className="flex h-2 overflow-hidden rounded-full bg-muted"
    >
      {attendanceStatuses.map((status) => (
        <span
          key={status}
          aria-hidden="true"
          className={cn("basis-0", statusColor[status])}
          style={{ flexGrow: counts[status] }}
        />
      ))}
    </div>
  );
}

export function AttendanceStatusBreakdown({
  counts,
}: {
  counts: AttendanceCounts;
}) {
  return (
    <dl className="grid grid-cols-2 gap-3 border-t p-4 sm:grid-cols-4 sm:p-5">
      {attendanceStatuses.map((status) => (
        <div key={status} className="rounded-sm bg-surface-subtle p-3">
          <dt className="flex items-center gap-2 text-xs leading-4 text-muted-foreground">
            <span
              aria-hidden="true"
              className={cn("size-2 shrink-0 rounded-full", statusColor[status])}
            />
            {attendanceStatusCopy[status]}
          </dt>
          <dd className="tabular-nums mt-2 text-xl leading-none font-semibold">
            {counts[status]}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const statusColor: Record<AttendanceStatus, string> = {
  present: "bg-status-present",
  late: "bg-status-late-foreground",
  absent: "bg-status-absent",
  excused: "bg-status-excused-foreground",
};
