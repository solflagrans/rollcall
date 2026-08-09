import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/features/groups/components/page-header";
import { redirectIfNonCanonical } from "@/features/groups/server/route-context";
import { MemberNotice } from "@/features/members/components/member-notice";
import { MemberRoster } from "@/features/members/components/member-roster";
import {
  type MemberListStatus,
  type MemberSortKey,
  type SortDirection,
} from "@/features/members/domain/members";
import { requireMembersRouteContext } from "@/features/members/server/route-context";

export const dynamic = "force-dynamic";

export default async function MembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{
    status?: string;
    sort?: string;
    direction?: string;
    notice?: string;
  }>;
}) {
  const { groupId } = await params;
  const query = await searchParams;
  const context = await requireMembersRouteContext(groupId);
  const { group, members } = context;
  const status: MemberListStatus = query.status === "inactive" ? "inactive" : "active";
  const sort: MemberSortKey =
    query.sort === "role" ? query.sort : "lastName";
  const direction: SortDirection = query.direction === "desc" ? "desc" : "asc";

  const canonicalSearch = new URLSearchParams();
  if (status === "inactive") canonicalSearch.set("status", status);
  if (sort !== "lastName") canonicalSearch.set("sort", sort);
  if (direction !== "asc") canonicalSearch.set("direction", direction);
  if (query.notice) canonicalSearch.set("notice", query.notice);
  const canonicalQuery = canonicalSearch.size > 0 ? `?${canonicalSearch.toString()}` : "";
  redirectIfNonCanonical(
    [{ received: groupId, canonical: group.publicId }],
    `/groups/${group.publicId}/members${canonicalQuery}`,
  );

  return (
    <div className="space-y-8">
      <MemberNotice notice={query.notice} />
      <PageHeader
        eyebrow={`Группа ${group.name}`}
        title="Состав группы"
        description="Управляйте активными и неактивными участниками группы."
        actions={
          <Button asChild>
            <Link href={`/groups/${group.publicId}/members/new`}>Добавить участника</Link>
          </Button>
        }
      />

      <MemberRoster
        groupId={group.publicId}
        members={members}
        status={status}
        sort={sort}
        direction={direction}
      />
    </div>
  );
}
