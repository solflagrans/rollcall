import { AppShell } from "@/features/groups/components/app-shell";
import { requireAppRouteContext } from "@/features/auth/server/route-context";

export const dynamic = "force-dynamic";

export default async function GroupsLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireAppRouteContext();
  return <AppShell viewer={viewer}>{children}</AppShell>;
}
