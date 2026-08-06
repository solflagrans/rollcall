import { requireAppSession } from "@/server/auth/session";
import { getStudentDashboard } from "@/server/services/dashboard";
import { StudentHistory } from "@/features/attendance/student-history";

export default async function AttendancePage() {
  const session = await requireAppSession();
  const data = await getStudentDashboard(session.groupId, session.membershipId);
  return <><header className="page-header"><div><h1>Мои посещения</h1><p>История занятий с фильтрами по дисциплине и статусу</p></div></header><StudentHistory rows={data.rows} /></>;
}
