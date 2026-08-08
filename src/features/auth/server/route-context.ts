import "server-only";

import { redirect } from "next/navigation";

import { getMembershipHome, isManagerialRole } from "@/features/auth/domain/models";
import {
  AuthorizationError,
  getCurrentAuthUser,
  getCurrentAuthProfile,
  listCurrentMemberships,
  requireGroupMembership,
  requireOwnStudentMembership,
} from "@/features/auth/server/authorization";

export async function redirectSignedInUser(): Promise<void> {
  const user = await getCurrentAuthUser();
  if (!user) return;
  if (!user.emailVerified) {
    redirect(`/auth/verify-email?email=${encodeURIComponent(user.email)}`);
  }
  redirect("/");
}

export async function requireAppRouteContext() {
  try {
    const user = await getCurrentAuthUser();
    if (!user) redirect("/auth/sign-in");
    if (!user.emailVerified) {
      redirect(`/auth/verify-email?email=${encodeURIComponent(user.email)}`);
    }
    const [profile, memberships] = await Promise.all([
      getCurrentAuthProfile(),
      listCurrentMemberships(),
    ]);
    if (!profile) redirect("/auth/sign-in?notice=profile-required");
    return { user, profile, memberships };
  } catch (error) {
    redirectForAuthorizationError(error);
  }
}

function redirectForAuthorizationError(error: unknown): never {
  if (!(error instanceof AuthorizationError)) throw error;
  if (error.code === "unauthenticated") redirect("/auth/sign-in");
  if (error.code === "email_unverified") redirect("/auth/verify-email");
  redirect("/");
}

export async function requireManagerRouteAccess(groupReference: string) {
  try {
    const context = await requireGroupMembership(groupReference);
    if (!isManagerialRole(context.membership.member.role)) {
      redirect(getMembershipHome(context.membership));
    }
    return context;
  } catch (error) {
    redirectForAuthorizationError(error);
  }
}

export async function requireGroupRouteAccess(groupReference: string) {
  try {
    return await requireGroupMembership(groupReference);
  } catch (error) {
    redirectForAuthorizationError(error);
  }
}

export async function requireOwnStudentRouteAccess(
  groupReference: string,
  memberReference: string,
) {
  try {
    return await requireOwnStudentMembership(groupReference, memberReference);
  } catch (error) {
    if (
      error instanceof AuthorizationError &&
      error.code === "own_student_view_required"
    ) {
      const context = await requireGroupMembership(groupReference);
      redirect(getMembershipHome(context.membership));
    }
    redirectForAuthorizationError(error);
  }
}
