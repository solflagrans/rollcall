import type { PeriodSummary } from "@/features/groups/domain/periods";
import { getPeriodStatus } from "@/features/groups/domain/periods";

export function getMemberAttendancePeriodSelection<T extends PeriodSummary>(
  periods: readonly T[],
  attendancePeriodIds: ReadonlySet<string>,
  memberIsActive: boolean,
  today: string,
) {
  const availablePeriods = periods
    .filter((period) => {
      const status = getPeriodStatus(period.startsOn, period.endsOn, today);
      if (status === "upcoming") return false;
      return (
        attendancePeriodIds.has(period.id) ||
        (memberIsActive && status === "current")
      );
    })
    .toSorted(
      (left, right) =>
        left.startsOn.localeCompare(right.startsOn) ||
        left.endsOn.localeCompare(right.endsOn) ||
        left.id.localeCompare(right.id),
    );

  const currentPeriod = availablePeriods
    .filter(
      (period) =>
        getPeriodStatus(period.startsOn, period.endsOn, today) === "current",
    )
    .toSorted(
      (left, right) =>
        right.startsOn.localeCompare(left.startsOn) ||
        right.endsOn.localeCompare(left.endsOn) ||
        left.id.localeCompare(right.id),
    )[0];

  const latestAttendancePeriod = availablePeriods
    .filter((period) => attendancePeriodIds.has(period.id))
    .toSorted(
      (left, right) =>
        right.endsOn.localeCompare(left.endsOn) ||
        right.startsOn.localeCompare(left.startsOn) ||
        left.id.localeCompare(right.id),
    )[0];

  return {
    availablePeriods,
    defaultPeriod: currentPeriod ?? latestAttendancePeriod,
  };
}
