import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getAppSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAppSession();
  if (!session) redirect("/login");
  if (!session.isActive) redirect("/login?error=inactive");
  if (session.role === "student") redirect("/access-denied");
  return <AppShell session={session}>{children}</AppShell>;
}
