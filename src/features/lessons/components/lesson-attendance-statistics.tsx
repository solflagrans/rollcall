import { AttendanceStatusDistribution } from "@/features/lessons/components/attendance-status-summary";
import {
  attendanceStatuses,
  getLessonAttendanceStatistics,
  type AttendanceDraft,
  type AttendanceStatus,
} from "@/features/lessons/domain/lessons";
import {
  attendanceStatusCopy,
  unmarkedAttendanceLabel,
} from "@/features/lessons/presentation/lesson-copy";
import { cn } from "@/lib/utils";

export function LessonAttendanceStatistics({
  attendance,
}: {
  attendance: readonly Pick<AttendanceDraft, "status">[];
}) {
  const statistics = getLessonAttendanceStatistics(attendance);
  const items = statistics.completed
    ? attendanceStatuses.map((status) => ({
        id: status,
        label: attendanceStatusCopy[status],
        count: statistics.counts[status],
      }))
    : [
        ...attendanceStatuses.map((status) => ({
          id: status,
          label: attendanceStatusCopy[status],
          count: statistics.counts[status],
        })),
        {
          id: "unmarked" as const,
          label: unmarkedAttendanceLabel,
          count: statistics.unmarked,
        },
      ];

  return (
    <section
      className="overflow-hidden rounded-sm border bg-card"
      aria-labelledby="lesson-statistics-title"
      aria-live="polite"
    >
      <div className="p-4 sm:p-5">
        <h3
          id="lesson-statistics-title"
          className="font-heading text-base font-semibold"
        >
          Статистика занятия
        </h3>

        {statistics.completed ? (
          <>
            <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
              <p className="tabular-nums font-heading text-3xl leading-none font-semibold tracking-tight">
                {statistics.percentage === null
                  ? "—"
                  : `${statistics.percentage}%`}
              </p>
              <p className="pb-0.5 text-sm text-muted-foreground">
                Присутствовали {statistics.attended} из {statistics.total} человек
              </p>
            </div>
            {statistics.percentage !== null ? (
              <div className="mt-4">
                <AttendanceStatusDistribution counts={statistics.counts} />
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-3">
            <p className="tabular-nums text-lg font-semibold">
              Отмечено {statistics.marked} из {statistics.total}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Итоговая посещаемость появится после заполнения всех отметок.
            </p>
          </div>
        )}
      </div>

      <dl
        className={cn(
          "grid grid-cols-2 border-t sm:grid-cols-4",
          !statistics.completed && "sm:grid-cols-5",
        )}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="border-r border-b px-4 py-3 last:border-r-0 sm:border-b-0"
          >
            <dt className="flex items-center gap-2 text-xs leading-4 text-muted-foreground">
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  item.id === "unmarked"
                    ? "bg-muted-foreground"
                    : statusColor[item.id],
                )}
              />
              {item.label}
            </dt>
            <dd className="tabular-nums mt-1.5 text-lg leading-none font-semibold">
              {item.count}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const statusColor: Record<AttendanceStatus, string> = {
  present: "bg-status-present",
  late: "bg-status-late-foreground",
  absent: "bg-status-absent",
  excused: "bg-status-excused-foreground",
};
