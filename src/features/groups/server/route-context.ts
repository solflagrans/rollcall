import "server-only";

import { redirect } from "next/navigation";

import { requireManagerRouteAccess } from "@/features/auth/server/route-context";
import {
  getGroupContext,
  getGroupPeriodContext,
} from "@/features/groups/server/operations";

export async function requireGroupRouteContext(groupReference: string) {
  await requireManagerRouteAccess(groupReference);
  const context = await getGroupContext(groupReference);
  if (!context) redirect("/groups/new?notice=group-not-found");
  return context;
}

export async function requireGroupPeriodRouteContext(
  groupReference: string,
  periodReference: string,
) {
  await requireManagerRouteAccess(groupReference);
  const context = await getGroupPeriodContext(groupReference, periodReference);
  if (!context) redirect("/groups/new?notice=group-not-found");
  if (!context.period) {
    redirect(`/groups/${context.group.publicId}?notice=period-not-found`);
  }
  return { ...context, period: context.period };
}

export function noticeQuery(notice: string | undefined): string {
  return notice ? `?notice=${encodeURIComponent(notice)}` : "";
}

export function redirectIfNonCanonical(
  references: ReadonlyArray<{ received: string; canonical: string }>,
  destination: string,
): void {
  if (references.some(({ received, canonical }) => received !== canonical)) {
    redirect(destination);
  }
}
