import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import {
  attendanceStatuses,
  lessonTypes,
} from "@/features/lessons/domain/lessons";
import { academicPeriodDisciplines } from "@/server/db/schema/disciplines";
import { groupMembers } from "@/server/db/schema/members";

export const lessonTypeEnum = pgEnum("lesson_type", lessonTypes);
export const attendanceStatusEnum = pgEnum(
  "attendance_status",
  attendanceStatuses,
);

const publicIdDefault = sql`substring(translate(encode(uuid_send(gen_random_uuid()), 'base64'), '+/', '-_') from 1 for 12)`;

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: varchar("public_id", { length: 12 })
      .default(publicIdDefault)
      .notNull()
      .unique(),
    periodId: uuid("period_id").notNull(),
    disciplineId: uuid("discipline_id").notNull(),
    lessonDate: date("lesson_date", { mode: "string" }).notNull(),
    lessonType: lessonTypeEnum("lesson_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: "lessons_period_discipline_fk",
      columns: [table.periodId, table.disciplineId],
      foreignColumns: [
        academicPeriodDisciplines.periodId,
        academicPeriodDisciplines.disciplineId,
      ],
    }).onDelete("restrict"),
    index("lessons_period_date_idx").on(table.periodId, table.lessonDate),
    index("lessons_discipline_idx").on(table.disciplineId),
  ],
);

export const lessonAttendance = pgTable(
  "lesson_attendance",
  {
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "restrict" }),
    groupMemberId: uuid("group_member_id")
      .notNull()
      .references(() => groupMembers.id, { onDelete: "restrict" }),
    status: attendanceStatusEnum("status"),
    comment: varchar("comment", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      name: "lesson_attendance_pk",
      columns: [table.lessonId, table.groupMemberId],
    }),
    check(
      "lesson_attendance_comment_not_blank",
      sql`${table.comment} IS NULL OR btrim(${table.comment}) <> ''`,
    ),
    index("lesson_attendance_member_idx").on(table.groupMemberId),
  ],
);

export type LessonRecord = typeof lessons.$inferSelect;
export type LessonAttendanceRecord = typeof lessonAttendance.$inferSelect;
