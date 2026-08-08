export type GroupServiceErrorCode =
  | "group_not_found"
  | "period_not_found"
  | "period_not_owned"
  | "overlapping_period_dates"
  | "period_starts_after_earliest_lesson"
  | "period_ends_before_latest_lesson";

export class GroupServiceError extends Error {
  constructor(
    public readonly code: GroupServiceErrorCode,
    public readonly conflictingLessonDate?: string,
  ) {
    super(code);
    this.name = "GroupServiceError";
  }
}

export function isExclusionViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23P01"
  );
}
