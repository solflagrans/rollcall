import { beforeEach, describe, expect, it } from "vitest";

import type { Discipline } from "@/features/disciplines/domain/disciplines";
import type { AcademicPeriod, Group } from "@/features/groups/domain/models";
import { isLessonCompleted, type Lesson, type LessonAttendance } from "@/features/lessons/domain/lessons";
import { LessonsServiceError } from "@/features/lessons/server/errors";
import type {
  AttendanceWriteValues,
  LessonsRepository,
  LessonWriteValues,
} from "@/features/lessons/server/repository";
import { LessonsService } from "@/features/lessons/server/service";
import type { GroupMember } from "@/features/members/domain/members";

const groupId = "00000000-0000-4000-8000-000000000001";
const periodId = "00000000-0000-4000-8000-000000000002";
const disciplineId = "00000000-0000-4000-8000-000000000003";

function recordBase(sequence: number) {
  return {
    id: `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
    publicId: `x${String(sequence).padStart(11, "0")}`,
    createdAt: new Date("2026-08-08T00:00:00Z"),
    updatedAt: new Date("2026-08-08T00:00:00Z"),
  };
}

class MemoryLessonsRepository implements LessonsRepository {
  group: Group = {
    ...recordBase(1),
    id: groupId,
    name: "2436",
    periodType: "semester",
  };
  period: AcademicPeriod = {
    ...recordBase(2),
    id: periodId,
    groupId,
    number: 1,
    startsOn: "2026-08-01",
    endsOn: "2026-12-31",
  };
  disciplines: Discipline[] = [
    {
      ...recordBase(3),
      id: disciplineId,
      groupId,
      name: "Математика",
      isArchived: false,
    },
  ];
  members: GroupMember[] = [
    {
      ...recordBase(10),
      groupId,
      firstName: "Анна",
      lastName: "Алексеева",
      email: null,
      role: "headman",
      isActive: true,
      userAccountId: null,
    },
    {
      ...recordBase(11),
      groupId,
      firstName: "Борис",
      lastName: "Белов",
      email: null,
      role: "deputy",
      isActive: true,
      userAccountId: null,
    },
    {
      ...recordBase(12),
      groupId,
      firstName: "Вера",
      lastName: "Волкова",
      email: null,
      role: "student",
      isActive: false,
      userAccountId: null,
    },
  ];
  created: Array<{ lesson: Lesson; attendance: LessonAttendance[] }> = [];

  async findGroup(reference: string) {
    return reference === this.group.id || reference === this.group.publicId
      ? this.group
      : undefined;
  }

  async findPeriod(targetGroupId: string, reference: string) {
    return targetGroupId === groupId &&
      (reference === this.period.id || reference === this.period.publicId)
      ? this.period
      : undefined;
  }

  async listPeriodDisciplines(targetGroupId: string, targetPeriodId: string) {
    return targetGroupId === groupId && targetPeriodId === periodId
      ? this.disciplines
      : [];
  }

  async listActiveMembers(targetGroupId: string) {
    return this.members.filter(
      (member) => member.groupId === targetGroupId && member.isActive,
    );
  }

  async insertLessonWithAttendance(
    targetPeriodId: string,
    targetDisciplineId: string,
    values: LessonWriteValues,
    attendanceValues: AttendanceWriteValues[],
  ) {
    const lesson: Lesson = {
      ...recordBase(20 + this.created.length),
      periodId: targetPeriodId,
      disciplineId: targetDisciplineId,
      ...values,
    };
    const attendance = attendanceValues.map((entry) => ({
      ...entry,
      lessonId: lesson.id,
      createdAt: new Date("2026-08-08T00:00:00Z"),
      updatedAt: new Date("2026-08-08T00:00:00Z"),
    }));
    const created = { lesson, attendance };
    this.created.push(created);
    return created;
  }
}

describe("LessonsService", () => {
  let repository: MemoryLessonsRepository;
  let service: LessonsService;

  beforeEach(() => {
    repository = new MemoryLessonsRepository();
    service = new LessonsService(repository);
  });

  it("creates a lesson for an assigned discipline and snapshots only active members", async () => {
    const [headman, deputy] = repository.members;
    const created = await service.createLesson(
      repository.group.publicId,
      repository.period.publicId,
      {
        lessonDate: "2026-09-10",
        disciplineId: repository.disciplines[0]!.publicId,
        lessonType: "lecture",
        attendance: [
          {
            groupMemberId: headman!.publicId,
            status: "present",
            comment: null,
          },
          {
            groupMemberId: deputy!.publicId,
            status: "late",
            comment: "  Транспорт  ",
          },
        ],
      },
    );

    expect(created.lesson).toMatchObject({
      periodId,
      disciplineId,
      lessonDate: "2026-09-10",
      lessonType: "lecture",
    });
    expect(created.attendance).toHaveLength(2);
    expect(created.attendance.map(({ status, comment }) => ({ status, comment }))).toEqual([
      { status: "present", comment: null },
      { status: "late", comment: "Транспорт" },
    ]);

    repository.members[0]!.isActive = false;
    repository.members.push({
      ...repository.members[1]!,
      ...recordBase(13),
      firstName: "Галина",
      lastName: "Громова",
    });
    expect(created.attendance).toHaveLength(2);
  });

  it("allows incomplete attendance and computes completion only from statuses", async () => {
    const created = await service.createLesson(groupId, periodId, {
      lessonDate: "2026-09-11",
      disciplineId,
      lessonType: "practice",
      attendance: [
        {
          groupMemberId: repository.members[0]!.id,
          status: "absent",
          comment: null,
        },
      ],
    });
    expect(isLessonCompleted(created.attendance)).toBe(false);
    expect(created.attendance.map(({ status }) => status)).toEqual(["absent", null]);
  });

  it("validates lesson date and discipline assignment", async () => {
    await expect(
      service.createLesson(groupId, periodId, {
        lessonDate: "2027-01-01",
        disciplineId,
        lessonType: "seminar",
        attendance: [],
      }),
    ).rejects.toMatchObject({ code: "date_outside_period" });

    await expect(
      service.createLesson(groupId, periodId, {
        lessonDate: "2026-09-12",
        disciplineId: "notassigned0",
        lessonType: "laboratory",
        attendance: [],
      }),
    ).rejects.toBeInstanceOf(LessonsServiceError);
  });
});
