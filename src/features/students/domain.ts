export function canDeleteMembership(attendanceCount: number) {
  return attendanceCount === 0;
}

export function canDeactivateAdmin(activeAdminCount: number, isTargetAdmin: boolean) {
  return !isTargetAdmin || activeAdminCount > 1;
}

export function canDeleteSubject(lessonCount: number) {
  return lessonCount === 0;
}
