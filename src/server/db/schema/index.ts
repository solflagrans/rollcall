import { sql } from "drizzle-orm";
import { boolean, date, index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("membership_role", ["headman", "deputy", "student"]);
export const lessonTypeEnum = pgEnum("lesson_type", ["lecture", "practice", "laboratory"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["present", "absent", "late", "excused"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  authUserId: text("auth_user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  ...timestamps,
});

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  activePeriodId: uuid("active_period_id"),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (t) => [index("groups_active_idx").on(t.isActive)]);

export const academicPeriods = pgTable("academic_periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => groups.id),
  name: text("name").notNull(),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (t) => [index("periods_group_idx").on(t.groupId), index("periods_active_idx").on(t.isActive)]);

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => groups.id),
  profileId: uuid("profile_id").notNull().references(() => profiles.id),
  role: roleEnum("role").notNull(),
  displayName: text("display_name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  joinedAt: date("joined_at").default(sql`CURRENT_DATE`).notNull(),
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [uniqueIndex("memberships_group_profile_uq").on(t.groupId, t.profileId), index("memberships_group_idx").on(t.groupId), index("memberships_active_idx").on(t.isActive)]);

export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => groups.id),
  academicPeriodId: uuid("academic_period_id").notNull().references(() => academicPeriods.id),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  teacher: text("teacher"),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
}, (t) => [index("subjects_group_idx").on(t.groupId), index("subjects_period_idx").on(t.academicPeriodId), index("subjects_active_idx").on(t.isActive)]);

export const lessons = pgTable("lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => groups.id),
  academicPeriodId: uuid("academic_period_id").notNull().references(() => academicPeriods.id),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id),
  lessonDate: date("lesson_date").notNull(),
  type: lessonTypeEnum("type").notNull(),
  comment: text("comment"),
  createdByMembershipId: uuid("created_by_membership_id").notNull().references(() => memberships.id),
  updatedByMembershipId: uuid("updated_by_membership_id").notNull().references(() => memberships.id),
  ...timestamps,
}, (t) => [index("lessons_group_date_idx").on(t.groupId, t.lessonDate), index("lessons_period_idx").on(t.academicPeriodId), index("lessons_subject_idx").on(t.subjectId)]);

export const attendance = pgTable("attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id),
  studentMembershipId: uuid("student_membership_id").notNull().references(() => memberships.id),
  status: attendanceStatusEnum("status").notNull(),
  comment: text("comment"),
  ...timestamps,
}, (t) => [uniqueIndex("attendance_lesson_student_uq").on(t.lessonId, t.studentMembershipId), index("attendance_lesson_idx").on(t.lessonId), index("attendance_student_idx").on(t.studentMembershipId), index("attendance_status_idx").on(t.status)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => groups.id),
  actorMembershipId: uuid("actor_membership_id").notNull().references(() => memberships.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("audit_group_created_idx").on(t.groupId, t.createdAt), index("audit_entity_idx").on(t.entityType, t.entityId)]);

export type Membership = typeof memberships.$inferSelect;
