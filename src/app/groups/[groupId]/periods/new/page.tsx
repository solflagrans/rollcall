import { redirect } from "next/navigation";

import { BackLink } from "@/features/groups/components/back-link";
import { FormCard } from "@/features/groups/components/form-card";
import { PageHeader } from "@/features/groups/components/page-header";
import { PeriodForm } from "@/features/groups/components/period-form";
import { periodTypeCopy } from "@/features/groups/presentation/period-copy";
import { toPeriodSummary } from "@/features/groups/presentation/period-view-model";
import {
  redirectIfNonCanonical,
  requireGroupRouteContext,
} from "@/features/groups/server/route-context";

export const dynamic = "force-dynamic";

export default async function NewPeriodPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ returnPeriod?: string }>;
}) {
  const { groupId } = await params;
  const { returnPeriod: returnPeriodReference } = await searchParams;
  const context = await requireGroupRouteContext(groupId);
  const { group, periods } = context;
  const returnPeriod = returnPeriodReference
    ? periods.find(
        (period) =>
          period.id === returnPeriodReference ||
          period.publicId === returnPeriodReference,
      )
    : undefined;
  if (returnPeriodReference && !returnPeriod) {
    redirect(`/groups/${group.publicId}/periods/new`);
  }
  const returnQuery = returnPeriod
    ? `?returnPeriod=${encodeURIComponent(returnPeriod.publicId)}`
    : "";
  redirectIfNonCanonical(
    [
      { received: groupId, canonical: group.publicId },
      ...(returnPeriodReference && returnPeriod
        ? [{ received: returnPeriodReference, canonical: returnPeriod.publicId }]
        : []),
    ],
    `/groups/${group.publicId}/periods/new${returnQuery}`,
  );
  const copy = periodTypeCopy[group.periodType];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow={`Группа ${group.name}`}
        title={copy.newAction}
        description={`Укажите номер и календарные даты. Для этой группы используются ${copy.plural.toLowerCase()}.`}
        actions={
          <BackLink
            href={
              returnPeriod
                ? `/groups/${group.publicId}/periods/${returnPeriod.publicId}`
                : `/groups/${group.publicId}`
            }
            label="Назад в группу"
          />
        }
      />
      <FormCard label={`Форма: ${copy.newAction.toLowerCase()}`}>
        <PeriodForm
          mode="create"
          groupId={group.publicId}
          groupPeriodType={group.periodType}
          periods={periods.map(toPeriodSummary)}
        />
      </FormCard>
    </div>
  );
}
