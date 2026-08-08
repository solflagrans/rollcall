import "server-only";

import { cache } from "react";

import {
  isManagerialRole,
  type AuthUserProfile,
} from "@/features/auth/domain/models";
import { auth } from "@/features/auth/server/neon-auth";
import { AuthRepository } from "@/features/auth/server/repository";

export type AuthorizationErrorCode =
  | "unauthenticated"
  | "email_unverified"
  | "profile_missing"
  | "membership_required"
  | "manager_required"
  | "own_student_view_required";

export class AuthorizationError extends Error {
  constructor(readonly code: AuthorizationErrorCode) {
    super(code);
    this.name = "AuthorizationError";
  }
}

export function getAuthorizationErrorMessage(error: unknown): string | undefined {
  if (!(error instanceof AuthorizationError)) return undefined;
  if (error.code === "unauthenticated") return "Войдите в аккаунт и повторите действие.";
  if (error.code === "email_unverified") return "Сначала подтвердите email аккаунта.";
  if (error.code === "profile_missing") return "В профиле аккаунта не заполнены имя и фамилия.";
  return "У вас нет прав для этого действия в выбранной группе.";
}

const repository = new AuthRepository();

export const getCurrentAuthUser = cache(async () => {
  const { data: session } = await auth.getSession();
  return session?.user ?? null;
});

export async function requireAuthUser() {
  const user = await getCurrentAuthUser();
  if (!user) throw new AuthorizationError("unauthenticated");
  if (!user.emailVerified) throw new AuthorizationError("email_unverified");
  return user;
}

function fallbackProfile(user: { id: string; name: string }): AuthUserProfile | undefined {
  const parts = user.name.trim().split(/\s+/u);
  const firstName = parts.shift();
  const lastName = parts.join(" ");
  return firstName && lastName
    ? { userId: user.id, firstName, lastName }
    : undefined;
}

export const getCurrentAuthProfile = cache(async () => {
  const user = await requireAuthUser();
  return (await repository.getProfile(user.id)) ?? fallbackProfile(user);
});

export async function requireAuthProfile() {
  const profile = await getCurrentAuthProfile();
  if (!profile) throw new AuthorizationError("profile_missing");
  return profile;
}

export const listCurrentMemberships = cache(async () => {
  const user = await requireAuthUser();
  return repository.listActiveMemberships(user.id);
});

export async function requireGroupMembership(groupReference: string) {
  const user = await requireAuthUser();
  const membership = await repository.findActiveMembership(user.id, groupReference);
  if (!membership) throw new AuthorizationError("membership_required");
  return { user, membership };
}

export async function requireManagerMembership(groupReference: string) {
  const context = await requireGroupMembership(groupReference);
  if (!isManagerialRole(context.membership.member.role)) {
    throw new AuthorizationError("manager_required");
  }
  return context;
}

export async function requireOwnStudentMembership(
  groupReference: string,
  memberReference: string,
) {
  const context = await requireGroupMembership(groupReference);
  const member = context.membership.member;
  if (member.id !== memberReference && member.publicId !== memberReference) {
    throw new AuthorizationError("own_student_view_required");
  }
  return context;
}

export async function saveAuthProfile(profile: AuthUserProfile) {
  return repository.saveProfileAndSyncHeadmanNames(profile);
}

/**
 * Сначала обновляет Auth User, затем его структурированный профиль Rollcall и
 * все связанные membership со старостой. После смены роли синхронизация записи
 * GroupMember прекращается автоматически благодаря условию role = headman.
 */
export async function updateCurrentAuthProfile(names: {
  firstName: string;
  lastName: string;
}) {
  const user = await requireAuthUser();
  const { error } = await auth.updateUser({
    name: `${names.firstName} ${names.lastName}`,
  });
  if (error) throw error;
  return saveAuthProfile({ userId: user.id, ...names });
}
