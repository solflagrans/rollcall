import { redirect } from "next/navigation";

import { getGroups } from "@/features/groups/server/operations";

export const dynamic = "force-dynamic";

export default async function Home() {
  const groups = await getGroups();
  redirect(groups[0] ? `/groups/${groups[0].id}` : "/groups/new");
}
