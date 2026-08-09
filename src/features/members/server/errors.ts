export type MembersServiceErrorCode =
  | "group_not_found"
  | "member_not_found"
  | "headman_required"
  | "headman_protected"
  | "deletion_connected"
  | "deletion_blocked";

export class MembersServiceError extends Error {
  constructor(public readonly code: MembersServiceErrorCode) {
    super(code);
    this.name = "MembersServiceError";
  }
}
