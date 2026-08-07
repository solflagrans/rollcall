import { CalendarPlus, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/features/groups/components/page-header";
import { SuccessNotice } from "@/features/groups/components/success-notice";
import {
  getAcademicPeriods,
  getGroup,
} from "@/features/groups/server/operations";
import { selectDefaultPeriod, getTodayDate } from "@/features/groups/domain/periods";

export const dynamic = "force-dynamic";

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { groupId } = await params;
  const [{ notice }, group, periods] = await Promise.all([
    searchParams,
    getGroup(groupId),
    getAcademicPeriods(groupId),
  ]);
  if (!group) notFound();

  if (periods.length > 0) {
    const defaultPeriod = selectDefaultPeriod(periods, getTodayDate());
    if (defaultPeriod) {
      const noticeQuery = notice ? `?notice=${encodeURIComponent(notice)}` : "";
      redirect(`/groups/${groupId}/periods/${defaultPeriod.id}${noticeQuery}`);
    }
  }

  return (
    <div className="space-y-8">
      <SuccessNotice notice={notice} />
      <PageHeader
        eyebrow="Учебная группа"
        title={`Группа ${group.name}`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/groups/${groupId}/edit`}>
              <Pencil aria-hidden="true" />
              Изменить
            </Link>
          </Button>
        }
      />

      <section className="rounded-md border bg-card p-6 sm:p-10">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <CalendarPlus aria-hidden="true" className="size-6" />
          </div>
          <h2 className="mt-5 font-heading text-xl font-semibold">
            Учебные периоды ещё не созданы
          </h2>
          <p className="mt-3 text-muted-foreground">
            Создайте период, чтобы в дальнейшем добавлять дисциплины, занятия и вести журнал
            посещаемости.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href={`/groups/${groupId}/periods/new`}>Создать период</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
