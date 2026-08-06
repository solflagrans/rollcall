import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { academicPeriods, attendance, groups, lessons, memberships, profiles, subjects } from "@/server/db/schema";
import { calculateAttendance } from "@/features/statistics/domain";
import type { AttendanceStatus } from "@/lib/constants";

export async function getGroupDashboard(groupId: string) {
  const lessonRows = await db.select({
    id: lessons.id, date: lessons.lessonDate, type: lessons.type, subject: subjects.shortName,
  }).from(lessons).innerJoin(subjects, eq(subjects.id, lessons.subjectId)).where(eq(lessons.groupId, groupId)).orderBy(desc(lessons.lessonDate)).limit(20);
  const lessonIds = lessonRows.map((lesson) => lesson.id);
  const marks = lessonIds.length ? await db.select({ lessonId: attendance.lessonId, status: attendance.status }).from(attendance).where(inArray(attendance.lessonId, lessonIds)) : [];
  const allStats = calculateAttendance(marks.map((mark) => mark.status));
  const summaries = lessonRows.map((lesson) => ({
    ...lesson,
    stats: calculateAttendance(marks.filter((mark) => mark.lessonId === lesson.id).map((mark) => mark.status)),
  }));
  const [period] = await db.select({ number: academicPeriods.number, system: groups.periodSystem, startsOn: academicPeriods.startsOn, endsOn: academicPeriods.endsOn })
    .from(academicPeriods).innerJoin(groups, eq(groups.id, academicPeriods.groupId))
    .where(and(eq(academicPeriods.groupId, groupId), eq(academicPeriods.isActive, true))).limit(1);
  const studentMarks = lessonIds.length ? await db.select({ studentId: attendance.studentMembershipId, status: attendance.status }).from(attendance).where(inArray(attendance.lessonId, lessonIds)) : [];
  const byStudent = new Map<string, AttendanceStatus[]>();
  for (const mark of studentMarks) byStudent.set(mark.studentId, [...(byStudent.get(mark.studentId) ?? []), mark.status]);
  const lowAttendance = [...byStudent.values()].filter((statuses) => (calculateAttendance(statuses).percentage ?? 100) < 70).length;
  return { period, lessons: summaries, totals: { lessons: lessonRows.length, percentage: allStats.percentage, absences: allStats.absent, lowAttendance } };
}

export async function getStudents(groupId: string) {
  const rows = await db.select({ id: memberships.id, displayName: memberships.displayName, role: memberships.role, isActive: memberships.isActive, email: profiles.email })
    .from(memberships).innerJoin(profiles, eq(profiles.id, memberships.profileId)).where(eq(memberships.groupId, groupId)).orderBy(memberships.displayName);
  const marks = await db.select({ studentId: attendance.studentMembershipId, status: attendance.status }).from(attendance).innerJoin(memberships, eq(memberships.id, attendance.studentMembershipId)).where(eq(memberships.groupId, groupId));
  return rows.map((row) => ({ ...row, stats: calculateAttendance(marks.filter((mark) => mark.studentId === row.id).map((mark) => mark.status)) }));
}

export async function getSubjects(groupId: string) {
  return db.select({ id: subjects.id, name: subjects.name, shortName: subjects.shortName, teacher: subjects.teacher, isActive: subjects.isActive, lessonCount: count(lessons.id) })
    .from(subjects).leftJoin(lessons, eq(lessons.subjectId, subjects.id)).where(eq(subjects.groupId, groupId)).groupBy(subjects.id).orderBy(subjects.name);
}

export async function getActiveLessonSetup(groupId: string) {
  const studentRows = await db.select({ id: memberships.id, displayName: memberships.displayName }).from(memberships).where(and(eq(memberships.groupId, groupId), eq(memberships.role, "student"), eq(memberships.isActive, true))).orderBy(memberships.displayName);
  const subjectRows = await db.select({ id: subjects.id, name: subjects.name, shortName: subjects.shortName, teacher: subjects.teacher }).from(subjects).where(and(eq(subjects.groupId, groupId), eq(subjects.isActive, true))).orderBy(subjects.name);
  return { students: studentRows, subjects: subjectRows };
}

export async function getStudentDashboard(groupId: string, membershipId: string) {
  const rows = await db.select({ id: attendance.id, status: attendance.status, date: lessons.lessonDate, type: lessons.type, subject: subjects.shortName })
    .from(attendance).innerJoin(lessons, eq(lessons.id, attendance.lessonId)).innerJoin(subjects, eq(subjects.id, lessons.subjectId))
    .where(and(eq(lessons.groupId, groupId), eq(attendance.studentMembershipId, membershipId))).orderBy(desc(lessons.lessonDate)).limit(100);
  const overall = calculateAttendance(rows.map((row) => row.status));
  const bySubject = [...new Set(rows.map((row) => row.subject))].map((subject) => ({ subject, ...calculateAttendance(rows.filter((row) => row.subject === subject).map((row) => row.status)) }));
  return { rows, overall, bySubject };
}

export async function getLessonForEdit(groupId: string, lessonId: string) {
  const [lesson] = await db.select().from(lessons).where(and(eq(lessons.id, lessonId), eq(lessons.groupId, groupId))).limit(1);
  if (!lesson) return null;
  const marks = await db.select({ studentMembershipId: attendance.studentMembershipId, status: attendance.status, comment: attendance.comment, displayName: memberships.displayName })
    .from(attendance).innerJoin(memberships, eq(memberships.id, attendance.studentMembershipId)).where(eq(attendance.lessonId, lessonId)).orderBy(memberships.displayName);
  const subjectRows = await db.select({ id: subjects.id, name: subjects.name, shortName: subjects.shortName, teacher: subjects.teacher }).from(subjects).where(eq(subjects.groupId, groupId)).orderBy(subjects.name);
  return { lesson, marks, subjects: subjectRows };
}

export async function getJournal(groupId: string) {
  const lessonRows = await db.select({ id: lessons.id, date: lessons.lessonDate, type: lessons.type, subjectId: subjects.id, subject: subjects.shortName })
    .from(lessons).innerJoin(subjects, eq(subjects.id, lessons.subjectId)).where(eq(lessons.groupId, groupId)).orderBy(desc(lessons.lessonDate)).limit(50);
  const ids = lessonRows.map((row) => row.id);
  const marks = ids.length ? await db.select({ lessonId: attendance.lessonId, studentId: attendance.studentMembershipId, studentName: memberships.displayName, status: attendance.status })
    .from(attendance).innerJoin(memberships, eq(memberships.id, attendance.studentMembershipId)).where(inArray(attendance.lessonId, ids)) : [];
  const rows = lessonRows.map((lesson) => ({ ...lesson, stats: calculateAttendance(marks.filter((mark) => mark.lessonId === lesson.id).map((mark) => mark.status)) }));
  const students = [...new Map(marks.map((mark) => [mark.studentId, { id: mark.studentId, name: mark.studentName }])).values()];
  return { rows, marks, students };
}
