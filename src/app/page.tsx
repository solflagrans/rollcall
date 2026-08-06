import { redirect } from "next/navigation";
import { getAppSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";
export default async function Home() {
  const session = await getAppSession();
  redirect(!session ? "/login" : session.role === "student" ? "/student" : "/dashboard");
}
