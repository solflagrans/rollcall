import { CalendarPlus } from "lucide-react";
import { redirect } from "next/navigation";

import { NewPeriodAction } from "@/features/groups/components/new-period-action";
import { PageHeader } from "@/features/groups/components/page-header";
import { SuccessNotice } from "@/features/groups/components/success-notice";
import { selectDefaultPeriod } from "@/features/groups/domain/periods";
import { periodTypeCopy } from "@/features/groups/presentation/period-copy";
import {
  noticeQuery,
  redirectIfNonCanonical,
  requireGroupRouteContext,
} from "@/features/groups/server/route-context";
import { getUserToday } from "@/features/preferences/server/user-time-zone";

export const dynamic = "force-dynamic";

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { groupId } = await params;
  const { notice } = await searchParams;
  const context = await requireGroupRouteContext(groupId);
  const { group, periods } = context;
  const copy = periodTypeCopy[group.periodType];

  const query = noticeQuery(notice);
  redirectIfNonCanonical(
    [{ received: groupId, canonical: group.publicId }],
    `/groups/${group.publicId}${query}`,
  );

  if (periods.length > 0) {
    const defaultPeriod = selectDefaultPeriod(periods, await getUserToday());
    if (defaultPeriod) {
      redirect(`/groups/${group.publicId}/periods/${defaultPeriod.publicId}${query}`);
    }
  }

  return (
    <div className="space-y-8">
      <SuccessNotice notice={notice} periodType={group.periodType} />
      <PageHeader
        eyebrow="Учебная группа"
        title={`Группа ${group.name}`}
      />

      <section className="rounded-md border bg-card p-6 sm:p-10">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <CalendarPlus aria-hidden="true" className="size-6" />
          </div>
          <h2 className="mt-5 font-heading text-xl font-semibold">
            {copy.plural} ещё не добавлены
          </h2>
          <p className="mt-3 text-muted-foreground">
            После добавления здесь появятся дисциплины, занятия и журнал посещаемости.
          </p>
          <div className="mt-6">
            <NewPeriodAction
              groupId={group.publicId}
              periodType={group.periodType}
              prominent
            />
          </div>
        </div>
      </section>
    </div>
  );
}
