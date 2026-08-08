import { describe, expect, it } from "vitest";

import { lessonFormSchema } from "@/features/lessons/schemas";

const disciplineId = "discipline1".padEnd(12, "0");
const memberId = "member1".padEnd(12, "0");

describe("lessonFormSchema", () => {
  it("normalizes optional attendance comments", () => {
    expect(
      lessonFormSchema.parse({
        lessonDate: "2026-08-08",
        disciplineId,
        lessonType: "seminar",
        attendance: [
          {
            groupMemberId: memberId,
            status: "excused",
            comment: "  Справка будет позже  ",
          },
        ],
      }).attendance[0],
    ).toMatchObject({
      status: "excused",
      comment: "Справка будет позже",
    });
  });

  it("rejects invalid dates, types and duplicate members", () => {
    expect(
      lessonFormSchema.safeParse({
        lessonDate: "2026-02-30",
        disciplineId,
        lessonType: "exam",
        attendance: [
          { groupMemberId: memberId, status: null, comment: null },
          { groupMemberId: memberId, status: "present", comment: null },
        ],
      }).success,
    ).toBe(false);
  });
});
