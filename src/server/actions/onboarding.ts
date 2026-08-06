"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { periodSystems } from "@/features/periods/domain";
import { getAppSession, getAuthIdentity } from "@/server/auth/session";
import { db } from "@/server/db";
import { academicPeriods, auditLogs, groups, memberships, profiles } from "@/server/db/schema";

export type OnboardingState = { error?: string };

const onboardingSchema = z.object({
  groupName: z.string().trim().min(2).max(120),
  description: z.string().trim().max(300).optional(),
  periodSystem: z.enum(periodSystems),
  periodNumber: z.coerce.number().int().min(1).max(24),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((data) => data.endsOn >= data.startsOn, { path: ["endsOn"] });

export async function createGroupAction(_state: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const identity = await getAuthIdentity();
  if (!identity) redirect("/login");
  if (!identity.emailVerified) return { error: "Сначала подтвердите email" };

  const existingSession = await getAppSession();
  if (existingSession) redirect(existingSession.role === "student" ? "/student" : "/dashboard");

  const parsed = onboardingSchema.safeParse({
    groupName: formData.get("groupName"),
    description: formData.get("description") || undefined,
    periodSystem: formData.get("periodSystem"),
    periodNumber: formData.get("periodNumber"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn"),
  });
  if (!parsed.success) return { error: "Проверьте название группы, номер периода и даты" };
  if (!identity.email || !identity.displayName) return { error: "В аккаунте отсутствуют имя или email" };
  const email = identity.email.toLowerCase();
  const displayName = identity.displayName;

  let destination = "/dashboard";
  try {
    destination = await db.transaction(async (tx) => {
      const [byAuth] = await tx.select().from(profiles).where(eq(profiles.authUserId, identity.authUserId)).limit(1);
      const [byEmail] = await tx.select().from(profiles).where(eq(profiles.email, email)).limit(1);
      if (byAuth && byEmail && byAuth.id !== byEmail.id) throw new Error("Identity conflict");

      let profile = byAuth ?? byEmail;
      if (profile && profile.authUserId !== identity.authUserId) {
        if (!profile.authUserId.startsWith("pending-")) throw new Error("Email already in use");
        [profile] = await tx.update(profiles).set({ authUserId: identity.authUserId, displayName, updatedAt: new Date() }).where(eq(profiles.id, profile.id)).returning();
      }
      if (!profile) {
        [profile] = await tx.insert(profiles).values({ authUserId: identity.authUserId, email, displayName }).returning();
      }

      const [existingMembership] = await tx.select({ role: memberships.role }).from(memberships)
        .where(and(eq(memberships.profileId, profile.id), eq(memberships.isActive, true))).limit(1);
      if (existingMembership) return existingMembership.role === "student" ? "/student" : "/dashboard";

      const [group] = await tx.insert(groups).values({
        name: parsed.data.groupName,
        description: parsed.data.description || null,
        periodSystem: parsed.data.periodSystem,
      }).returning({ id: groups.id });
      const [period] = await tx.insert(academicPeriods).values({
        groupId: group.id,
        number: parsed.data.periodNumber,
        startsOn: parsed.data.startsOn,
        endsOn: parsed.data.endsOn,
      }).returning({ id: academicPeriods.id });
      await tx.update(groups).set({ activePeriodId: period.id, updatedAt: new Date() }).where(eq(groups.id, group.id));
      const [membership] = await tx.insert(memberships).values({
        groupId: group.id,
        profileId: profile.id,
        role: "headman",
        displayName,
      }).returning({ id: memberships.id });
      await tx.insert(auditLogs).values({
        groupId: group.id,
        actorMembershipId: membership.id,
        entityType: "group",
        entityId: group.id,
        action: "group.created",
        afterData: { name: parsed.data.groupName, periodSystem: parsed.data.periodSystem, periodNumber: parsed.data.periodNumber },
      });
      return "/dashboard";
    });
  } catch {
    return { error: "Не удалось создать группу. Попробуйте ещё раз" };
  }

  redirect(destination);
}
