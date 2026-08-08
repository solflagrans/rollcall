import "server-only";

import { redirect } from "next/navigation";

import { getPeriodStatus } from "@/features/groups/domain/periods";
import { redirectIfNonCanonical } from "@/features/groups/server/route-context";
import { getMemberAttendancePeriodSelection } from "@/features/lessons/domain/member-attendance";
import {
  getCompletedMemberAttendance,
  getLessonContext,
  getLessonCreationContext,
  getMemberAttendancePeriodIds,
} from "@/features/lessons/server/operations";
import { requireStudentMemberRouteContext } from "@/features/members/server/route-context";
import { getUserToday } from "@/features/preferences/server/user-time-zone";

type StudentAttendanceSection = "attendance" | "statistics";

export async function requireStudentAttendanceRouteContext({
  groupReference,
  memberReference,
  periodReference,
  section,
}: {
  groupReference: string;
  memberReference: string;
  periodReference?: string;
  section: StudentAttendanceSection;
}) {
  const { group, periods, member } = await requireStudentMemberRouteContext(
    groupReference,
    memberReference,
  );
  const [today, attendancePeriodIds] = await Promise.all([
    getUserToday(),
    getMemberAttendancePeriodIds(member.id),
  ]);
  const { availablePeriods, defaultPeriod } =
    getMemberAttendancePeriodSelection(
      periods,
      new Set(attendancePeriodIds),
      member.isActive,
      today,
    );
  const requestedPeriod = periodReference
    ? availablePeriods.find(
        (period) =>
          period.id === periodReference || period.publicId === periodReference,
      )
    : undefined;
  const selectedPeriod = requestedPeriod ?? defaultPeriod;
  const sectionPath = `/groups/${group.publicId}/student/${member.publicId}/${section}`;

  if (periodReference && !requestedPeriod) redirect(sectionPath);

  const canonicalPeriodQuery = requestedPeriod
    ? `?period=${encodeURIComponent(requestedPeriod.publicId)}`
    : "";
  redirectIfNonCanonical(
    [
      { received: groupReference, canonical: group.publicId },
      { received: memberReference, canonical: member.publicId },
      ...(periodReference && requestedPeriod
        ? [{ received: periodReference, canonical: requestedPeriod.publicId }]
        : []),
    ],
    `${sectionPath}${canonicalPeriodQuery}`,
  );

  const attendance = selectedPeriod
    ? await getCompletedMemberAttendance(selectedPeriod.id, member.id)
    : [];

  return {
    group,
    member,
    availablePeriods,
    selectedPeriod,
    selectedPeriodStatus: selectedPeriod
      ? getPeriodStatus(selectedPeriod.startsOn, selectedPeriod.endsOn, today)
      : undefined,
    attendance,
    sectionPath,
  };
}

export async function requireLessonCreationRouteContext(
  groupReference: string,
  periodReference: string,
) {
  const context = await getLessonCreationContext(groupReference, periodReference);
  if (!context) redirect("/groups/new?notice=group-not-found");
  if (!context.period) {
    redirect(`/groups/${context.group.publicId}?notice=period-not-found`);
  }
  return { ...context, period: context.period };
}

export async function requireLessonRouteContext(
  groupReference: string,
  periodReference: string,
  lessonReference: string,
) {
  const context = await getLessonContext(
    groupReference,
    periodReference,
    lessonReference,
  );
  if (!context) redirect("/groups/new?notice=group-not-found");
  if (!context.period) {
    redirect(`/groups/${context.group.publicId}?notice=period-not-found`);
  }
  if (!context.lesson) {
    redirect(
      `/groups/${context.group.publicId}/periods/${context.period.publicId}?notice=lesson-not-found`,
    );
  }
  return { ...context, period: context.period, lesson: context.lesson };
}
