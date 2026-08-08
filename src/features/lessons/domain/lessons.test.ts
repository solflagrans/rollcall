import { describe, expect, it } from "vitest";

import {
  fillUnmarkedAttendance,
  getAttendanceProgress,
  isLessonCompleted,
  resetAttendance,
  selectJournalMembers,
  type AttendanceDraft,
} from "@/features/lessons/domain/lessons";

const attendance: AttendanceDraft[] = [
  { groupMemberId: "a", status: "late", comment: "Пробки" },
  { groupMemberId: "b", status: null, comment: null },
  { groupMemberId: "c", status: null, comment: "Уточнить" },
];

describe("lesson attendance", () => {
  it("fills only unmarked entries and never overwrites a manual status", () => {
    const filled = fillUnmarkedAttendance(attendance, "present");
    expect(filled.map(({ status }) => status)).toEqual([
      "late",
      "present",
      "present",
    ]);
    expect(filled[0]?.comment).toBe("Пробки");
  });

  it("resets all statuses and comments without removing attendance rows", () => {
    const reset = resetAttendance(attendance);
    expect(reset).toHaveLength(3);
    expect(reset).toEqual(
      attendance.map(({ groupMemberId }) => ({
        groupMemberId,
        status: null,
        comment: null,
      })),
    );
  });

  it("computes progress and completion instead of storing a flag", () => {
    expect(getAttendanceProgress(attendance)).toEqual({
      total: 3,
      marked: 1,
      unmarked: 2,
      completed: false,
    });
    expect(isLessonCompleted(fillUnmarkedAttendance(attendance, "absent"))).toBe(true);
    expect(isLessonCompleted([])).toBe(true);
  });

  it("keeps active and historical members once and sorts by last and first name", () => {
    const historical = [
      { id: "2", publicId: "member000002", firstName: "Яна", lastName: "Белов", isActive: false },
      { id: "1", publicId: "member000001", firstName: "Анна", lastName: "Алексеева", isActive: false },
    ];
    const active = [
      { ...historical[1]!, isActive: true },
      { id: "3", publicId: "member000003", firstName: "Борис", lastName: "Белов", isActive: true },
    ];

    expect(
      selectJournalMembers(active, historical).map(
        ({ publicId, isActive }) => ({ publicId, isActive }),
      ),
    ).toEqual([
      { publicId: "member000001", isActive: true },
      { publicId: "member000003", isActive: true },
      { publicId: "member000002", isActive: false },
    ]);
  });
});
