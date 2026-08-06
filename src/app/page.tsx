import { redirect } from "next/navigation";
import { getAppSession, getAuthIdentity } from "@/server/auth/session";

export const dynamic = "force-dynamic";
export default async function Home() {
  const session = await getAppSession();
  if (!session) redirect((await getAuthIdentity()) ? "/onboarding" : "/login");
  redirect(session.role === "student" ? "/student" : "/dashboard");
}
