import type { Discipline } from "@/features/disciplines/domain/disciplines";

export type DisciplinesServiceErrorCode =
  | "group_not_found"
  | "period_not_found"
  | "discipline_not_found"
  | "duplicate_name"
  | "duplicate_archived_name"
  | "archived_not_assignable"
  | "already_assigned"
  | "assignment_not_found"
  | "deletion_blocked"
  | "unlink_blocked";

export class DisciplinesServiceError extends Error {
  constructor(
    public readonly code: DisciplinesServiceErrorCode,
    public readonly conflictingDiscipline?: Discipline,
  ) {
    super(code);
    this.name = "DisciplinesServiceError";
  }
}
