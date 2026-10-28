import { DisciplineNotice } from "@/features/disciplines/components/discipline-notice";
import { DisciplinePool } from "@/features/disciplines/components/discipline-pool";
import { NewDisciplineDialog } from "@/features/disciplines/components/new-discipline-dialog";
import type { DisciplineListStatus } from "@/features/disciplines/domain/disciplines";
import { requireDisciplinesRouteContext } from "@/features/disciplines/server/route-context";
import { PageHeader } from "@/features/groups/components/page-header";
import { redirectIfNonCanonical } from "@/features/groups/server/route-context";

export const dynamic = "force-dynamic";

export default async function DisciplinesPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ status?: string; notice?: string }>;
}) {
  const { groupId } = await params;
  const query = await searchParams;
  const { group, disciplines } = await requireDisciplinesRouteContext(groupId);
  const status: DisciplineListStatus =
    query.status === "archived" ? "archived" : "active";
  const canonicalSearch = new URLSearchParams();
  if (status === "archived") canonicalSearch.set("status", status);
  if (query.notice) canonicalSearch.set("notice", query.notice);
  const suffix = canonicalSearch.size > 0 ? `?${canonicalSearch.toString()}` : "";
  redirectIfNonCanonical(
    [{ received: groupId, canonical: group.publicId }],
    `/groups/${group.publicId}/disciplines${suffix}`,
  );

  return (
    <div className="space-y-8">
      <DisciplineNotice notice={query.notice} />
      <PageHeader
        eyebrow={`Группа ${group.name}`}
        title="Дисциплины"
        description="Создавайте дисциплины группы и подключайте их к учебным периодам."
        actions={
          disciplines.length > 0 ? (
            <NewDisciplineDialog groupId={group.publicId} />
          ) : undefined
        }
      />
      <DisciplinePool
        groupId={group.publicId}
        disciplines={disciplines}
        status={status}
      />
    </div>
  );
}
