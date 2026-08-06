import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { requireAppSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAppSession();
  if (session.role === "student") redirect("/access-denied");
  return <AppShell session={session}>{children}</AppShell>;
}
