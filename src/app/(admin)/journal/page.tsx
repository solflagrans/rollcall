import Link from "next/link";
import { Plus } from "lucide-react";
import { JournalView } from "@/features/attendance/journal-view";
import { requireAppSession } from "@/server/auth/session";
import { getJournal } from "@/server/services/dashboard";

export default async function JournalPage() {
  const session = await requireAppSession();
  const data = await getJournal(session.groupId);
  return <><header className="page-header"><div><h1>Журнал</h1><p>Занятия и сводная посещаемость группы</p></div><Link href="/lessons/new" className="button primary"><Plus size={18} /><span>Добавить занятие</span></Link></header><JournalView {...data} /></>;
}
