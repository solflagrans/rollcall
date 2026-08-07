import { notFound } from "next/navigation";

import { GroupForm } from "@/features/groups/components/group-form";
import { PageHeader } from "@/features/groups/components/page-header";
import { getAcademicPeriod, getGroup } from "@/features/groups/server/operations";

export const dynamic = "force-dynamic";

export default async function EditGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ periodId?: string }>;
}) {
  const { groupId } = await params;
  const { periodId } = await searchParams;
  const group = await getGroup(groupId);
  if (!group) notFound();

  const returnPeriod = periodId ? await getAcademicPeriod(groupId, periodId) : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader eyebrow="Настройки группы" title={`Изменить группу ${group.name}`} />
      <section className="rounded-md border bg-card p-5 sm:p-8" aria-label="Форма редактирования группы">
        <GroupForm
          mode="edit"
          groupId={groupId}
          defaultName={group.name}
          returnPeriodId={returnPeriod?.id}
        />
      </section>
    </div>
  );
}
