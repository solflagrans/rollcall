export type GroupServiceErrorCode =
  | "group_not_found"
  | "period_not_found"
  | "period_not_owned"
  | "period_type_missing"
  | "period_type_already_set"
  | "duplicate_period_number"
  | "first_period_conflict";

export class GroupServiceError extends Error {
  constructor(public readonly code: GroupServiceErrorCode) {
    super(code);
    this.name = "GroupServiceError";
  }
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}
