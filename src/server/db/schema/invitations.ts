import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { authUserProfiles } from "@/server/db/schema/auth";
import { groups } from "@/server/db/schema/groups";
import { groupMembers } from "@/server/db/schema/members";

export const invitationStatuses = [
  "pending",
  "accepted",
  "declined",
  "expired",
  "revoked",
] as const;
export const invitationMethods = ["rollcall_id", "link"] as const;

export const groupInvitationStatusEnum = pgEnum(
  "group_invitation_status",
  invitationStatuses,
);
export const groupInvitationMethodEnum = pgEnum(
  "group_invitation_method",
  invitationMethods,
);

const publicIdDefault = sql`substring(translate(encode(uuid_send(gen_random_uuid()), 'base64'), '+/', '-_') from 1 for 12)`;

export const groupInvitations = pgTable(
  "group_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: varchar("public_id", { length: 12 })
      .default(publicIdDefault)
      .notNull()
      .unique(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    groupMemberId: uuid("group_member_id")
      .notNull()
      .references(() => groupMembers.id, { onDelete: "cascade" }),
    invitedByUserId: varchar("invited_by_user_id", { length: 255 })
      .notNull()
      .references(() => authUserProfiles.userId, { onDelete: "restrict" }),
    targetUserId: varchar("target_user_id", { length: 255 }).references(
      () => authUserProfiles.userId,
      { onDelete: "restrict" },
    ),
    method: groupInvitationMethodEnum("method").notNull(),
    tokenHash: varchar("token_hash", { length: 64 }),
    status: groupInvitationStatusEnum("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "group_invitations_method_target",
      sql`(${table.method} = 'rollcall_id' AND ${table.targetUserId} IS NOT NULL AND ${table.tokenHash} IS NULL) OR (${table.method} = 'link' AND ${table.tokenHash} IS NOT NULL)`,
    ),
    index("group_invitations_group_idx").on(table.groupId),
    index("group_invitations_member_idx").on(table.groupMemberId),
    index("group_invitations_target_status_idx").on(
      table.targetUserId,
      table.status,
    ),
    uniqueIndex("group_invitations_token_hash_unique")
      .on(table.tokenHash)
      .where(sql`${table.tokenHash} IS NOT NULL`),
    uniqueIndex("group_invitations_one_pending_per_member_method")
      .on(table.groupMemberId, table.method)
      .where(sql`${table.status} = 'pending'`),
  ],
);

export type GroupInvitationRecord = typeof groupInvitations.$inferSelect;
