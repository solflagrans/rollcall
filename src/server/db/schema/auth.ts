import { sql } from "drizzle-orm";
import { check, pgTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

const rollcallIdDefault = sql`'rc_' || substring(translate(encode(uuid_send(gen_random_uuid()), 'base64'), '+/', '-_') from 1 for 16)`;

export const authUserProfiles = pgTable(
  "auth_user_profiles",
  {
    userId: varchar("user_id", { length: 255 }).primaryKey(),
    rollcallId: varchar("rollcall_id", { length: 19 })
      .default(rollcallIdDefault)
      .notNull(),
    firstName: varchar("first_name", { length: 80 }).notNull(),
    lastName: varchar("last_name", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("auth_user_profiles_first_name_not_blank", sql`btrim(${table.firstName}) <> ''`),
    check("auth_user_profiles_last_name_not_blank", sql`btrim(${table.lastName}) <> ''`),
    uniqueIndex("auth_user_profiles_rollcall_id_unique").on(table.rollcallId),
  ],
);

export type AuthUserProfileRecord = typeof authUserProfiles.$inferSelect;
