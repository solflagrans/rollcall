import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { groupMemberRoles } from "@/features/members/domain/members";
import { groups } from "@/server/db/schema/groups";

export const groupMemberRoleEnum = pgEnum("group_member_role", groupMemberRoles);

const publicIdDefault = sql`substring(translate(encode(uuid_send(gen_random_uuid()), 'base64'), '+/', '-_') from 1 for 12)`;

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: varchar("public_id", { length: 12 }).default(publicIdDefault).notNull().unique(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "restrict" }),
    firstName: varchar("first_name", { length: 80 }).notNull(),
    lastName: varchar("last_name", { length: 80 }).notNull(),
    email: varchar("email", { length: 320 }),
    role: groupMemberRoleEnum("role").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    userAccountId: uuid("user_account_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("group_members_first_name_not_blank", sql`btrim(${table.firstName}) <> ''`),
    check("group_members_last_name_not_blank", sql`btrim(${table.lastName}) <> ''`),
    check(
      "group_members_headman_active",
      sql`${table.role} <> 'headman' OR ${table.isActive}`,
    ),
    check(
      "group_members_email_normalized",
      sql`${table.email} IS NULL OR (${table.email} = lower(btrim(${table.email})) AND btrim(${table.email}) <> '')`,
    ),
    index("group_members_group_id_idx").on(table.groupId),
    index("group_members_group_active_idx").on(table.groupId, table.isActive),
    index("group_members_last_name_idx").on(table.lastName),
    uniqueIndex("group_members_group_email_unique")
      .on(table.groupId, sql`lower(btrim(${table.email}))`)
      .where(sql`${table.email} IS NOT NULL`),
    uniqueIndex("group_members_one_headman_per_group")
      .on(table.groupId)
      .where(sql`${table.role} = 'headman'`),
  ],
);
