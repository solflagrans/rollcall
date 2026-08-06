"use server";

import { randomUUID } from "node:crypto";
import { and, count, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { auditLogs, memberships, profiles, subjects } from "@/server/db/schema";
import { getAppSession } from "@/server/auth/session";
import { assertPermission } from "@/server/permissions";
import { membershipRoles } from "@/lib/constants";

export type FormState = { ok?: boolean; error?: string };
const studentSchema = z.object({ name: z.string().trim().min(2).max(120), email: z.email(), role: z.enum(membershipRoles) });
const subjectSchema = z.object({ name: z.string().trim().min(2).max(160), shortName: z.string().trim().min(1).max(50), teacher: z.string().trim().max(120).optional() });

export async function addStudentAction(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await getAppSession();
  if (!session) return { error: "Сессия истекла" };
  const parsed = studentSchema.safeParse({ name: formData.get("name"), email: formData.get("email"), role: formData.get("role") ?? "student" });
  if (!parsed.success) return { error: "Проверьте имя, email и роль" };
  try {
    assertPermission(session, "students.manage", session.groupId);
    await db.transaction(async (tx) => {
      const [profile] = await tx.insert(profiles).values({ authUserId: `pending-${randomUUID()}`, email: parsed.data.email.toLowerCase(), displayName: parsed.data.name }).returning({ id: profiles.id });
      await tx.insert(memberships).values({ groupId: session.groupId, profileId: profile.id, displayName: parsed.data.name, role: parsed.data.role });
    });
    revalidatePath("/students");
    return { ok: true };
  } catch { return { error: "Не удалось добавить: возможно, email уже используется" }; }
}

export async function setMembershipActiveAction(id: string, active: boolean) {
  const session = await getAppSession();
  if (!session) return;
  assertPermission(session, "students.manage", session.groupId);
  const [target] = await db.select().from(memberships).where(and(eq(memberships.id, id), eq(memberships.groupId, session.groupId))).limit(1);
  if (!target) return;
  if (!active && target.role !== "student") {
    const [admins] = await db.select({ value: count() }).from(memberships).where(and(eq(memberships.groupId, session.groupId), eq(memberships.isActive, true), ne(memberships.role, "student")));
    if (admins.value <= 1) throw new Error("Нельзя деактивировать последнего администратора");
  }
  await db.transaction(async (tx) => {
    await tx.update(memberships).set({ isActive: active, deactivatedAt: active ? null : new Date(), updatedAt: new Date() }).where(eq(memberships.id, id));
    await tx.insert(auditLogs).values({ groupId: session.groupId, actorMembershipId: session.membershipId, entityType: "membership", entityId: id, action: active ? "membership.activated" : "membership.deactivated", beforeData: { isActive: target.isActive }, afterData: { isActive: active } });
  });
  revalidatePath("/students");
}

export async function addSubjectAction(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await getAppSession();
  if (!session?.activePeriodId) return { error: "Нет активного периода" };
  const parsed = subjectSchema.safeParse({ name: formData.get("name"), shortName: formData.get("shortName"), teacher: formData.get("teacher") });
  if (!parsed.success) return { error: "Проверьте поля дисциплины" };
  try {
    assertPermission(session, "subjects.manage", session.groupId);
    const [subject] = await db.insert(subjects).values({ ...parsed.data, groupId: session.groupId, academicPeriodId: session.activePeriodId }).returning({ id: subjects.id });
    await db.insert(auditLogs).values({ groupId: session.groupId, actorMembershipId: session.membershipId, entityType: "subject", entityId: subject.id, action: "subject.created", afterData: parsed.data });
    revalidatePath("/subjects");
    return { ok: true };
  } catch { return { error: "Не удалось добавить дисциплину" }; }
}

export async function toggleSubjectAction(id: string, active: boolean) {
  const session = await getAppSession();
  if (!session) return;
  assertPermission(session, "subjects.manage", session.groupId);
  const [subject] = await db.select().from(subjects).where(and(eq(subjects.id, id), eq(subjects.groupId, session.groupId))).limit(1);
  if (!subject) return;
  await db.transaction(async (tx) => {
    await tx.update(subjects).set({ isActive: active, updatedAt: new Date() }).where(eq(subjects.id, id));
    await tx.insert(auditLogs).values({ groupId: session.groupId, actorMembershipId: session.membershipId, entityType: "subject", entityId: id, action: active ? "subject.activated" : "subject.archived", beforeData: { isActive: subject.isActive }, afterData: { isActive: active } });
  });
  revalidatePath("/subjects");
}
