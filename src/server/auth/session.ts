import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { groups, memberships, profiles } from "@/server/db/schema";
import type { MembershipRole } from "@/lib/constants";

const COOKIE = "rollcall_demo_session";

function signature(value: string) {
  return createHmac("sha256", process.env.DEMO_AUTH_SECRET ?? "missing-demo-secret").update(value).digest("hex");
}

export async function setDemoSession(authUserId: string) {
  const value = `${authUserId}.${signature(authUserId)}`;
  (await cookies()).set(COOKIE, value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 8, path: "/" });
}

export async function clearSession() {
  if (process.env.DEMO_MODE === "true") {
    (await cookies()).delete(COOKIE);
    return;
  }
  const { neonAuth } = await import("./neon");
  await neonAuth.signOut();
}

export type AuthIdentity = {
  authUserId: string;
  email?: string;
  displayName?: string;
  emailVerified: boolean;
};

async function loadAuthIdentity(): Promise<AuthIdentity | null> {
  if (process.env.DEMO_MODE === "true") {
    const raw = (await cookies()).get(COOKIE)?.value;
    if (!raw) return null;
    const [authUserId, supplied] = raw.split(".");
    if (!authUserId || !supplied) return null;
    const expected = signature(authUserId);
    if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null;
    return { authUserId, emailVerified: true };
  }
  const { neonAuth } = await import("./neon");
  const { data } = await neonAuth.getSession();
  if (!data?.user) return null;
  return { authUserId: data.user.id, email: data.user.email, displayName: data.user.name, emailVerified: data.user.emailVerified };
}

export const getAuthIdentity = cache(loadAuthIdentity);

export type AppSession = {
  profileId: string;
  authUserId: string;
  email: string;
  membershipId: string;
  groupId: string;
  groupName: string;
  activePeriodId: string | null;
  displayName: string;
  role: MembershipRole;
  isActive: boolean;
};

async function loadAppSession(): Promise<AppSession | null> {
  const identity = await getAuthIdentity();
  if (!identity) return null;
  const [row] = await db.select({
    profileId: profiles.id,
    authUserId: profiles.authUserId,
    email: profiles.email,
    membershipId: memberships.id,
    groupId: memberships.groupId,
    groupName: groups.name,
    activePeriodId: groups.activePeriodId,
    displayName: memberships.displayName,
    role: memberships.role,
    isActive: memberships.isActive,
  }).from(profiles).innerJoin(memberships, eq(memberships.profileId, profiles.id)).innerJoin(groups, eq(groups.id, memberships.groupId)).where(and(eq(profiles.authUserId, identity.authUserId), eq(groups.isActive, true))).limit(1);
  return row ?? null;
}

export const getAppSession = cache(loadAppSession);

export async function requireAppSession() {
  const session = await getAppSession();
  if (!session) redirect((await getAuthIdentity()) ? "/onboarding" : "/login");
  if (!session.isActive) redirect("/login?error=inactive");
  return session;
}
