import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { periodTypes } from "@/features/groups/domain/periods";

export const periodTypeEnum = pgEnum("period_type", periodTypes);

const publicIdDefault = sql`substring(translate(encode(uuid_send(gen_random_uuid()), 'base64'), '+/', '-_') from 1 for 12)`;

export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicId: varchar("public_id", { length: 12 }).default(publicIdDefault).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  periodType: periodTypeEnum("period_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const academicPeriods = pgTable(
  "academic_periods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: varchar("public_id", { length: 12 }).default(publicIdDefault).notNull().unique(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "restrict" }),
    number: integer("number").notNull(),
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    endsOn: date("ends_on", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("academic_periods_number_range", sql`${table.number} between 1 and 99`),
    check("academic_periods_date_range", sql`${table.startsOn} <= ${table.endsOn}`),
    index("academic_periods_group_id_idx").on(table.groupId),
    index("academic_periods_starts_on_idx").on(table.startsOn),
    index("academic_periods_ends_on_idx").on(table.endsOn),
  ],
);

export type GroupRecord = typeof groups.$inferSelect;
export type AcademicPeriodRecord = typeof academicPeriods.$inferSelect;
