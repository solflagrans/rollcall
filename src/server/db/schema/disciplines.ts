import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { academicPeriods, groups } from "@/server/db/schema/groups";

const publicIdDefault = sql`substring(translate(encode(uuid_send(gen_random_uuid()), 'base64'), '+/', '-_') from 1 for 12)`;

export const disciplines = pgTable(
  "disciplines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: varchar("public_id", { length: 12 }).default(publicIdDefault).notNull().unique(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 120 }).notNull(),
    isArchived: boolean("is_archived").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("disciplines_name_not_blank", sql`btrim(${table.name}) <> ''`),
    check("disciplines_name_trimmed", sql`${table.name} = btrim(${table.name})`),
    index("disciplines_group_archived_idx").on(table.groupId, table.isArchived),
    index("disciplines_group_name_idx").on(table.groupId, table.name),
    uniqueIndex("disciplines_group_normalized_name_unique").on(
      table.groupId,
      sql`lower(btrim(${table.name}))`,
    ),
  ],
);

export const academicPeriodDisciplines = pgTable(
  "academic_period_disciplines",
  {
    periodId: uuid("period_id")
      .notNull()
      .references(() => academicPeriods.id, { onDelete: "restrict" }),
    disciplineId: uuid("discipline_id")
      .notNull()
      .references(() => disciplines.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      name: "academic_period_disciplines_pk",
      columns: [table.periodId, table.disciplineId],
    }),
    index("academic_period_disciplines_discipline_idx").on(table.disciplineId),
  ],
);

export type DisciplineRecord = typeof disciplines.$inferSelect;
export type AcademicPeriodDisciplineRecord = typeof academicPeriodDisciplines.$inferSelect;
