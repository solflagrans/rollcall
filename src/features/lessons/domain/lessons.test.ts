import { describe, expect, it } from "vitest";

import {
  fillUnmarkedAttendance,
  getAttendanceProgress,
  isLessonCompleted,
  resetAttendance,
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
});
