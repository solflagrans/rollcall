export type InvitationErrorCode =
  | "member_not_found"
  | "member_inactive"
  | "member_connected"
  | "profile_not_found"
  | "already_group_member"
  | "pending_exists"
  | "invitation_not_found"
  | "invitation_not_pending"
  | "invitation_expired"
  | "link_unavailable"
  | "invitation_not_for_user";

export class InvitationServiceError extends Error {
  constructor(readonly code: InvitationErrorCode) {
    super(code);
    this.name = "InvitationServiceError";
  }
}
