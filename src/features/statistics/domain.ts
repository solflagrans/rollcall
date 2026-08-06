import type { AttendanceStatus } from "@/lib/constants";

export type AttendanceStats = Record<AttendanceStatus, number> & { attended: number; denominator: number; percentage: number | null };

export function percentage(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function calculateAttendance(statuses: AttendanceStatus[]): AttendanceStats {
  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const status of statuses) counts[status] += 1;
  const attended = counts.present + counts.late;
  const denominator = statuses.length - counts.excused;
  return { ...counts, attended, denominator, percentage: percentage(attended, denominator) };
}
