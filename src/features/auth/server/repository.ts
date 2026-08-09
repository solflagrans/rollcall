import "server-only";

import { and, asc, eq, or } from "drizzle-orm";

import type {
  AuthUserProfile,
  AuthUserProfileInput,
  UserMembership,
} from "@/features/auth/domain/models";
import { entityIdSchema } from "@/features/groups/schemas";
import { getDatabase } from "@/server/db/client";
import { readWithRetry } from "@/server/db/read-retry";
import {
  authUserProfiles,
  groupMembers,
  groups,
} from "@/server/db/schema";

export class AuthRepository {
  private readonly database = getDatabase();

  async getProfile(userId: string): Promise<AuthUserProfile | undefined> {
    const [profile] = await readWithRetry("auth.profile", () =>
      this.database
        .select({
          userId: authUserProfiles.userId,
          rollcallId: authUserProfiles.rollcallId,
          firstName: authUserProfiles.firstName,
          lastName: authUserProfiles.lastName,
        })
        .from(authUserProfiles)
        .where(eq(authUserProfiles.userId, userId))
        .limit(1),
    );
    return profile;
  }

  async saveProfileAndSyncHeadmanNames(
    profile: AuthUserProfileInput,
  ): Promise<AuthUserProfile> {
    const profileUpsert = this.database
      .insert(authUserProfiles)
      .values(profile)
      .onConflictDoUpdate({
        target: authUserProfiles.userId,
        set: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          updatedAt: new Date(),
        },
      })
      .returning({
        userId: authUserProfiles.userId,
        rollcallId: authUserProfiles.rollcallId,
        firstName: authUserProfiles.firstName,
        lastName: authUserProfiles.lastName,
      });
    const headmanUpdate = this.database
      .update(groupMembers)
      .set({
        firstName: profile.firstName,
        lastName: profile.lastName,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(groupMembers.userId, profile.userId),
          eq(groupMembers.role, "headman"),
        ),
      );
    const [savedProfiles] = await this.database.batch([
      profileUpsert,
      headmanUpdate,
    ]);
    const saved = savedProfiles[0];
    if (!saved) throw new Error("Auth profile upsert returned no row");
    return saved;
  }

  async listActiveMemberships(userId: string): Promise<UserMembership[]> {
    const rows = await readWithRetry("auth.memberships", () =>
      this.database
        .select({ group: groups, member: groupMembers })
        .from(groupMembers)
        .innerJoin(groups, eq(groups.id, groupMembers.groupId))
        .where(
          and(eq(groupMembers.userId, userId), eq(groupMembers.isActive, true)),
        )
        .orderBy(asc(groups.name), asc(groups.createdAt), asc(groups.id)),
    );
    return rows.map(({ group, member }) => ({
      group: { id: group.id, publicId: group.publicId, name: group.name },
      member: { id: member.id, publicId: member.publicId, role: member.role },
    }));
  }

  async findActiveMembership(
    userId: string,
    groupReference: string,
  ): Promise<UserMembership | undefined> {
    const groupFilter = entityIdSchema.safeParse(groupReference).success
      ? or(eq(groups.id, groupReference), eq(groups.publicId, groupReference))
      : eq(groups.publicId, groupReference);
    const [row] = await readWithRetry("auth.membership", () =>
      this.database
        .select({ group: groups, member: groupMembers })
        .from(groupMembers)
        .innerJoin(groups, eq(groups.id, groupMembers.groupId))
        .where(
          and(
            eq(groupMembers.userId, userId),
            eq(groupMembers.isActive, true),
            groupFilter,
          ),
        )
        .limit(1),
    );
    if (!row) return undefined;
    return {
      group: {
        id: row.group.id,
        publicId: row.group.publicId,
        name: row.group.name,
      },
      member: {
        id: row.member.id,
        publicId: row.member.publicId,
        role: row.member.role,
      },
    };
  }
}
