"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { attendance, auditLogs, groups, lessons, memberships, subjects } from "@/server/db/schema";
import { getAppSession } from "@/server/auth/session";
import { assertPermission } from "@/server/permissions";
import { lessonFormSchema, type LessonFormValues } from "@/features/attendance/validation";

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

function safeError(error: unknown) {
  if (error instanceof Error && ["FORBIDDEN", "ACCOUNT_INACTIVE", "GROUP_SCOPE_VIOLATION"].includes(error.message)) return "Нет доступа к этой операции";
  return "Не удалось сохранить занятие";
}

export async function createLessonAction(input: LessonFormValues): Promise<ActionResult> {
  const parsed = lessonFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Проверьте заполнение формы" };
  const session = await getAppSession();
  if (!session) return { ok: false, error: "Сессия истекла. Войдите снова" };
  try {
    assertPermission(session, "attendance.manage", parsed.data.groupId);
    const result = await db.transaction(async (tx) => {
      const [group] = await tx.select({ periodId: groups.activePeriodId }).from(groups).where(eq(groups.id, parsed.data.groupId)).limit(1);
      const [subject] = await tx.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, parsed.data.subjectId), eq(subjects.groupId, parsed.data.groupId), eq(subjects.isActive, true))).limit(1);
      if (!group?.periodId || !subject) throw new Error("INVALID_SCOPE");
      const activeStudents = await tx.select({ id: memberships.id }).from(memberships).where(and(eq(memberships.groupId, parsed.data.groupId), eq(memberships.role, "student"), eq(memberships.isActive, true)));
      const expected = new Set(activeStudents.map((student) => student.id));
      if (parsed.data.marks.length !== expected.size || parsed.data.marks.some((mark) => !expected.has(mark.studentMembershipId))) throw new Error("INVALID_STUDENTS");
      const [lesson] = await tx.insert(lessons).values({
        groupId: parsed.data.groupId, academicPeriodId: group.periodId, subjectId: parsed.data.subjectId,
        lessonDate: parsed.data.lessonDate, type: parsed.data.type, comment: parsed.data.comment,
        createdByMembershipId: session.membershipId, updatedByMembershipId: session.membershipId,
      }).returning({ id: lessons.id });
      await tx.insert(attendance).values(parsed.data.marks.map((mark) => ({ lessonId: lesson.id, ...mark })));
      await tx.insert(auditLogs).values({ groupId: parsed.data.groupId, actorMembershipId: session.membershipId, entityType: "lesson", entityId: lesson.id, action: "lesson.created", afterData: parsed.data });
      return lesson;
    });
    revalidatePath("/dashboard");
    revalidatePath("/journal");
    return { ok: true, id: result.id };
  } catch (error) {
    return { ok: false, error: safeError(error) };
  }
}

export async function updateLessonAction(lessonId: string, input: LessonFormValues): Promise<ActionResult> {
  const parsed = lessonFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Проверьте заполнение формы" };
  const session = await getAppSession();
  if (!session) return { ok: false, error: "Сессия истекла. Войдите снова" };
  try {
    assertPermission(session, "attendance.manage", parsed.data.groupId);
    await db.transaction(async (tx) => {
      const [before] = await tx.select().from(lessons).where(and(eq(lessons.id, lessonId), eq(lessons.groupId, parsed.data.groupId))).limit(1);
      const [subject] = await tx.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, parsed.data.subjectId), eq(subjects.groupId, parsed.data.groupId))).limit(1);
      if (!before || !subject) throw new Error("INVALID_SCOPE");
      const studentIds = parsed.data.marks.map((mark) => mark.studentMembershipId);
      const scopedStudents = studentIds.length ? await tx.select({ id: memberships.id }).from(memberships).where(and(eq(memberships.groupId, parsed.data.groupId), inArray(memberships.id, studentIds))) : [];
      if (scopedStudents.length !== studentIds.length) throw new Error("INVALID_STUDENTS");
      await tx.update(lessons).set({ subjectId: parsed.data.subjectId, lessonDate: parsed.data.lessonDate, type: parsed.data.type, comment: parsed.data.comment, updatedByMembershipId: session.membershipId, updatedAt: new Date() }).where(eq(lessons.id, lessonId));
      for (const mark of parsed.data.marks) {
        const [oldMark] = await tx.select().from(attendance).where(and(eq(attendance.lessonId, lessonId), eq(attendance.studentMembershipId, mark.studentMembershipId))).limit(1);
        if (oldMark && (oldMark.status !== mark.status || oldMark.comment !== mark.comment)) {
          await tx.update(attendance).set({ status: mark.status, comment: mark.comment, updatedAt: new Date() }).where(eq(attendance.id, oldMark.id));
          await tx.insert(auditLogs).values({ groupId: parsed.data.groupId, actorMembershipId: session.membershipId, entityType: "attendance", entityId: oldMark.id, action: "attendance.updated", beforeData: oldMark, afterData: mark });
        }
      }
      await tx.insert(auditLogs).values({ groupId: parsed.data.groupId, actorMembershipId: session.membershipId, entityType: "lesson", entityId: lessonId, action: "lesson.updated", beforeData: before, afterData: parsed.data });
    });
    revalidatePath("/dashboard");
    revalidatePath("/journal");
    return { ok: true, id: lessonId };
  } catch (error) {
    return { ok: false, error: safeError(error) };
  }
}
