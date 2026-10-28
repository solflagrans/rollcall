import { BookOpenText } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FormCard } from "@/features/groups/components/form-card";
import { BackLink } from "@/features/groups/components/back-link";
import { PageHeader } from "@/features/groups/components/page-header";
import {
  formatPeriodName,
} from "@/features/groups/presentation/period-copy";
import { redirectIfNonCanonical } from "@/features/groups/server/route-context";
import { LessonForm } from "@/features/lessons/components/lesson-form";
import { requireLessonCreationRouteContext } from "@/features/lessons/server/route-context";
import { getUserToday } from "@/features/preferences/server/user-time-zone";

export const dynamic = "force-dynamic";

export default async function NewLessonPage({
  params,
}: {
  params: Promise<{ groupId: string; periodId: string }>;
}) {
  const { groupId, periodId } = await params;
  const context = await requireLessonCreationRouteContext(groupId, periodId);
  const { group, period, disciplines, activeMembers } = context;
  const canonicalPath = `/groups/${group.publicId}/periods/${period.publicId}/lessons/new`;
  redirectIfNonCanonical(
    [
      { received: groupId, canonical: group.publicId },
      { received: periodId, canonical: period.publicId },
    ],
    canonicalPath,
  );

  const periodName = formatPeriodName(group.periodType, period.number);
  const periodHref = `/groups/${group.publicId}/periods/${period.publicId}`;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow={`Группа ${group.name} · ${periodName}`}
        title="Новое занятие"
        description="Укажите параметры занятия и заполните первичную посещаемость."
        actions={<BackLink href={periodHref} label="В журнал" />}
      />

      {disciplines.length > 0 ? (
        <FormCard label="Форма создания занятия">
          <LessonForm
            groupId={group.publicId}
            periodId={period.publicId}
            startsOn={period.startsOn}
            endsOn={period.endsOn}
            defaultLessonDate={clampDate(
              await getUserToday(),
              period.startsOn,
              period.endsOn,
            )}
            disciplines={disciplines.map(({ publicId, name }) => ({ publicId, name }))}
            members={activeMembers.map(({ publicId, firstName, lastName }) => ({
              publicId,
              firstName,
              lastName,
            }))}
          />
        </FormCard>
      ) : (
        <section data-surface="subtle" className="rounded-md bg-surface-subtle p-6 sm:p-8">
          <BookOpenText aria-hidden="true" className="size-8 text-muted-foreground" />
          <h2 className="mt-4 font-heading text-xl font-semibold">
            Сначала добавьте дисциплину
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Занятие можно создать только по дисциплине, подключённой к этому учебному периоду.
          </p>
          <Button asChild className="mt-5">
            <Link href={`${periodHref}?add-disciplines=1#period-disciplines-title`}>
              Перейти к добавлению дисциплин
            </Link>
          </Button>
        </section>
      )}
    </div>
  );
}

function clampDate(today: string, startsOn: string, endsOn: string): string {
  if (today < startsOn) return startsOn;
  if (today > endsOn) return endsOn;
  return today;
}
