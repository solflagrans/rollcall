export type LessonsServiceErrorCode =
  | "group_not_found"
  | "period_not_found"
  | "discipline_not_assigned"
  | "date_outside_period"
  | "context_changed";

export class LessonsServiceError extends Error {
  constructor(
    public readonly code: LessonsServiceErrorCode,
    public readonly details?: { startsOn: string; endsOn: string },
  ) {
    super(code);
    this.name = "LessonsServiceError";
  }
}
