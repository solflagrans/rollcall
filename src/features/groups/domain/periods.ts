export const periodTypes = ["semester", "trimester", "quarter", "year"] as const;

export type PeriodType = (typeof periodTypes)[number];
export type PeriodStatus = "upcoming" | "current" | "completed";

export const periodTypeLabels: Record<PeriodType, string> = {
  semester: "Семестр",
  trimester: "Триместр",
  quarter: "Четверть",
  year: "Год",
};

export const periodStatusLabels: Record<PeriodStatus, string> = {
  upcoming: "Предстоящий",
  current: "Текущий",
  completed: "Завершённый",
};

export interface PeriodDates {
  startsOn: string;
  endsOn: string;
}

export interface PeriodSummary extends PeriodDates {
  id: string;
  number: number;
}

export function formatPeriodName(periodType: PeriodType, number: number): string {
  return `${number} ${periodTypeLabels[periodType]}`;
}

export function getPeriodStatus(
  startsOn: string,
  endsOn: string,
  today: string,
): PeriodStatus {
  if (startsOn > today) return "upcoming";
  if (endsOn < today) return "completed";
  return "current";
}

export function findOverlappingPeriods<T extends PeriodSummary>(
  period: PeriodDates & { id?: string },
  periods: readonly T[],
): T[] {
  return periods.filter(
    (candidate) =>
      candidate.id !== period.id &&
      period.startsOn <= candidate.endsOn &&
      period.endsOn >= candidate.startsOn,
  );
}

function compareIds(left: PeriodSummary, right: PeriodSummary) {
  return left.id.localeCompare(right.id);
}

export function selectDefaultPeriod<T extends PeriodSummary>(
  periods: readonly T[],
  today: string,
): T | undefined {
  const current = periods
    .filter((period) => getPeriodStatus(period.startsOn, period.endsOn, today) === "current")
    .toSorted(
      (left, right) =>
        right.startsOn.localeCompare(left.startsOn) ||
        right.endsOn.localeCompare(left.endsOn) ||
        compareIds(left, right),
    );
  if (current[0]) return current[0];

  const upcoming = periods
    .filter((period) => getPeriodStatus(period.startsOn, period.endsOn, today) === "upcoming")
    .toSorted(
      (left, right) =>
        left.startsOn.localeCompare(right.startsOn) ||
        left.endsOn.localeCompare(right.endsOn) ||
        compareIds(left, right),
    );
  if (upcoming[0]) return upcoming[0];

  return periods
    .filter((period) => getPeriodStatus(period.startsOn, period.endsOn, today) === "completed")
    .toSorted(
      (left, right) =>
        right.endsOn.localeCompare(left.endsOn) ||
        right.startsOn.localeCompare(left.startsOn) ||
        compareIds(left, right),
    )[0];
}

export function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatCalendarDate(date: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
