import { sql } from "drizzle-orm";
import { check, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const authUserProfiles = pgTable(
  "auth_user_profiles",
  {
    userId: varchar("user_id", { length: 255 }).primaryKey(),
    firstName: varchar("first_name", { length: 80 }).notNull(),
    lastName: varchar("last_name", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("auth_user_profiles_first_name_not_blank", sql`btrim(${table.firstName}) <> ''`),
    check("auth_user_profiles_last_name_not_blank", sql`btrim(${table.lastName}) <> ''`),
  ],
);

export type AuthUserProfileRecord = typeof authUserProfiles.$inferSelect;
