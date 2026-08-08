import { beforeEach, describe, expect, it, vi } from "vitest";

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
      userId: null,
    },
    {
      ...recordBase(11),
      groupId,
      firstName: "Борис",
      lastName: "Белов",
      email: null,
      role: "deputy",
      isActive: true,
      userId: null,
    },
    {
      ...recordBase(12),
      groupId,
      firstName: "Вера",
      lastName: "Волкова",
      email: null,
      role: "student",
      isActive: false,
      userId: null,
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

  async findGroupPeriod(groupReference: string, periodReference: string) {
    const group = await this.findGroup(groupReference);
    if (!group) return undefined;
    return {
      group,
      period: await this.findPeriod(group.id, periodReference),
    };
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

  async listPeriodLessons(targetPeriodId: string) {
    return this.created
      .filter(({ lesson }) => lesson.periodId === targetPeriodId)
      .map(({ lesson }) => ({
        lesson,
        discipline: this.disciplines.find(
          ({ id }) => id === lesson.disciplineId,
        )!,
      }));
  }

  async listPeriodAttendance(targetPeriodId: string) {
    return this.created
      .filter(({ lesson }) => lesson.periodId === targetPeriodId)
      .flatMap(({ attendance }) =>
        attendance.map((entry) => ({
          attendance: entry,
          member: this.members.find(({ id }) => id === entry.groupMemberId)!,
        })),
      );
  }

  async getPeriodJournalRows(targetGroupId: string, targetPeriodId: string) {
    return {
      activeMembers: await this.listActiveMembers(targetGroupId),
      lessonRows: await this.listPeriodLessons(targetPeriodId),
      attendanceRows: await this.listPeriodAttendance(targetPeriodId),
    };
  }

  async listCompletedMemberAttendance(
    targetPeriodId: string,
    targetMemberId: string,
  ) {
    return this.created
      .filter(
        ({ lesson, attendance }) =>
          lesson.periodId === targetPeriodId &&
          attendance.length > 0 &&
          attendance.every(({ status }) => status !== null),
      )
      .flatMap(({ lesson, attendance }) => {
        const entry = attendance.find(
          ({ groupMemberId }) => groupMemberId === targetMemberId,
        );
        if (!entry?.status) return [];
        return [
          {
            lesson,
            discipline: this.disciplines.find(
              ({ id }) => id === lesson.disciplineId,
            )!,
            attendance: { ...entry, status: entry.status },
          },
        ];
      })
      .toSorted(
        (left, right) =>
          right.lesson.lessonDate.localeCompare(left.lesson.lessonDate) ||
          right.lesson.id.localeCompare(left.lesson.id),
      );
  }

  async listMemberAttendancePeriodIds(targetMemberId: string) {
    return [
      ...new Set(
        this.created.flatMap(({ lesson, attendance }) =>
          attendance.some(
            ({ groupMemberId }) => groupMemberId === targetMemberId,
          )
            ? [lesson.periodId]
            : [],
        ),
      ),
    ];
  }

  async findLesson(targetPeriodId: string, reference: string) {
    const created = this.created.find(
      ({ lesson }) =>
        lesson.periodId === targetPeriodId &&
        (lesson.id === reference || lesson.publicId === reference),
    );
    return created
      ? {
          lesson: created.lesson,
          discipline: this.disciplines.find(
            ({ id }) => id === created.lesson.disciplineId,
          )!,
        }
      : undefined;
  }

  async findLessonWithAttendance(targetPeriodId: string, reference: string) {
    const lesson = await this.findLesson(targetPeriodId, reference);
    if (!lesson) return undefined;
    return {
      ...lesson,
      attendance: await this.listLessonAttendance(lesson.lesson.id),
    };
  }

  async listLessonAttendance(targetLessonId: string) {
    const created = this.created.find(
      ({ lesson }) => lesson.id === targetLessonId,
    );
    return (created?.attendance ?? []).map((entry) => ({
      attendance: entry,
      member: this.members.find(({ id }) => id === entry.groupMemberId)!,
    }));
  }

  async updateLessonAttendance(
    targetLessonId: string,
    values: AttendanceWriteValues[],
  ) {
    const created = this.created.find(
      ({ lesson }) => lesson.id === targetLessonId,
    );
    if (!created) return [];
    created.attendance = created.attendance.map((entry) => {
      const value = values.find(
        ({ groupMemberId }) => groupMemberId === entry.groupMemberId,
      );
      return value ? { ...entry, ...value } : entry;
    });
    return created.attendance;
  }

  async updateLesson(
    targetLessonId: string,
    targetDisciplineId: string,
    values: LessonWriteValues,
  ) {
    const created = this.created.find(
      ({ lesson }) => lesson.id === targetLessonId,
    );
    if (!created) return undefined;
    created.lesson = {
      ...created.lesson,
      ...values,
      disciplineId: targetDisciplineId,
      updatedAt: new Date("2026-08-09T00:00:00Z"),
    };
    return created.lesson;
  }

  async deleteLessonWithAttendance(targetLessonId: string) {
    const index = this.created.findIndex(
      ({ lesson }) => lesson.id === targetLessonId,
    );
    if (index < 0) return undefined;
    const [deleted] = this.created.splice(index, 1);
    return deleted?.lesson;
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

  it("builds a historical journal and completes an existing lesson", async () => {
    const created = await service.createLesson(groupId, periodId, {
      lessonDate: "2026-09-15",
      disciplineId,
      lessonType: "lecture",
      attendance: [
        {
          groupMemberId: repository.members[0]!.publicId,
          status: "present",
          comment: null,
        },
      ],
    });
    repository.members[1]!.isActive = false;

    const journal = await service.getJournal(groupId, periodId);
    expect(journal.lessons).toHaveLength(1);
    expect(journal.members.map(({ publicId }) => publicId)).toEqual([
      repository.members[0]!.publicId,
      repository.members[1]!.publicId,
    ]);

    const partiallyUpdated = await service.updateLessonAttendance(
      groupId,
      periodId,
      created.lesson.publicId,
      {
        attendance: [
          {
            groupMemberId: repository.members[0]!.publicId,
            status: null,
            comment: null,
          },
          {
            groupMemberId: repository.members[1]!.publicId,
            status: "excused",
            comment: "Справка",
          },
        ],
      },
      "2026-08-08",
    );
    expect(partiallyUpdated.attendance.map(({ status }) => status)).toEqual([
      null,
      "excused",
    ]);

    const updated = await service.updateLessonAttendance(
      groupId,
      periodId,
      created.lesson.publicId,
      {
        attendance: [
          {
            groupMemberId: repository.members[0]!.publicId,
            status: "present",
            comment: null,
          },
        ],
      },
      "2026-08-08",
    );
    expect(isLessonCompleted(updated.attendance)).toBe(true);
    const reset = await service.updateLessonAttendance(
      groupId,
      periodId,
      created.lesson.publicId,
      {
        attendance: [
          {
            groupMemberId: repository.members[0]!.publicId,
            status: null,
            comment: null,
          },
        ],
      },
      "2026-08-08",
    );
    expect(reset.attendance.map(({ status }) => status)).toEqual([
      null,
      "excused",
    ]);
  });

  it("returns only completed lessons from one member snapshot, newest first", async () => {
    const member = repository.members[0]!;
    await service.createLesson(groupId, periodId, {
      lessonDate: "2026-09-10",
      disciplineId,
      lessonType: "lecture",
      attendance: repository.members.slice(0, 2).map(({ publicId }) => ({
        groupMemberId: publicId,
        status: "present" as const,
        comment: publicId === member.publicId ? "Хорошая работа" : null,
      })),
    });
    await service.createLesson(groupId, periodId, {
      lessonDate: "2026-09-12",
      disciplineId,
      lessonType: "practice",
      attendance: [
        {
          groupMemberId: member.publicId,
          status: "late",
          comment: null,
        },
      ],
    });
    await service.createLesson(groupId, periodId, {
      lessonDate: "2026-09-11",
      disciplineId,
      lessonType: "seminar",
      attendance: repository.members.slice(0, 2).map(({ publicId }) => ({
        groupMemberId: publicId,
        status: "excused" as const,
        comment: null,
      })),
    });

    const attendance = await service.getCompletedMemberAttendance(
      periodId,
      member.id,
    );

    expect(attendance.map(({ lesson }) => lesson.lessonDate)).toEqual([
      "2026-09-11",
      "2026-09-10",
    ]);
    expect(attendance.map(({ attendance: entry }) => entry.status)).toEqual([
      "excused",
      "present",
    ]);
    expect(attendance[1]?.attendance.comment).toBe("Хорошая работа");

    await expect(
      service.getMemberAttendancePeriodIds(member.id),
    ).resolves.toEqual([periodId]);

    const memberOutsideSnapshots = repository.members[2]!;
    await expect(
      service.getCompletedMemberAttendance(periodId, memberOutsideSnapshots.id),
    ).resolves.toEqual([]);
  });

  it("makes a period available from an incomplete lesson snapshot", async () => {
    const member = repository.members[0]!;
    const memberOutsideSnapshot = repository.members[2]!;

    await service.createLesson(groupId, periodId, {
      lessonDate: "2026-09-12",
      disciplineId,
      lessonType: "practice",
      attendance: [
        {
          groupMemberId: member.publicId,
          status: "late",
          comment: null,
        },
      ],
    });

    await expect(
      service.getMemberAttendancePeriodIds(member.id),
    ).resolves.toEqual([periodId]);
    await expect(
      service.getCompletedMemberAttendance(periodId, member.id),
    ).resolves.toEqual([]);
    await expect(
      service.getMemberAttendancePeriodIds(memberOutsideSnapshot.id),
    ).resolves.toEqual([]);
  });

  it("loads an existing lesson without querying the current active roster", async () => {
    const created = await service.createLesson(groupId, periodId, {
      lessonDate: "2026-09-16",
      disciplineId,
      lessonType: "lecture",
      attendance: [],
    });
    const activeMembers = vi.spyOn(repository, "listActiveMembers");
    const groupPeriod = vi.spyOn(repository, "findGroupPeriod");
    const lessonWithAttendance = vi.spyOn(
      repository,
      "findLessonWithAttendance",
    );

    const context = await service.getLessonContext(
      groupId,
      periodId,
      created.lesson.publicId,
    );

    expect(context?.lesson?.id).toBe(created.lesson.id);
    expect(activeMembers).not.toHaveBeenCalled();
    expect(groupPeriod).toHaveBeenCalledTimes(1);
    expect(lessonWithAttendance).toHaveBeenCalledTimes(1);
  });

  it("updates lesson metadata without changing the attendance snapshot", async () => {
    const created = await service.createLesson(groupId, periodId, {
      lessonDate: "2026-09-15",
      disciplineId,
      lessonType: "lecture",
      attendance: [
        {
          groupMemberId: repository.members[0]!.publicId,
          status: "present",
          comment: "Первая пара",
        },
      ],
    });
    const archivedDiscipline: Discipline = {
      ...recordBase(4),
      groupId,
      name: "Физика",
      isArchived: true,
    };
    repository.disciplines.push(archivedDiscipline);
    const snapshotBefore = structuredClone(created.attendance);

    const updated = await service.updateLesson(
      groupId,
      periodId,
      created.lesson.publicId,
      {
        lessonDate: "2026-10-20",
        disciplineId: archivedDiscipline.publicId,
        lessonType: "seminar",
      },
      "2026-08-08",
    );

    expect(updated.lesson).toMatchObject({
      lessonDate: "2026-10-20",
      disciplineId: archivedDiscipline.id,
      lessonType: "seminar",
    });
    expect(created.attendance).toEqual(snapshotBefore);

    await expect(
      service.updateLesson(
        groupId,
        periodId,
        created.lesson.publicId,
        {
          lessonDate: "2027-01-01",
          disciplineId: archivedDiscipline.publicId,
          lessonType: "seminar",
        },
        "2026-08-08",
      ),
    ).rejects.toMatchObject({ code: "date_outside_period" });
    await expect(
      service.updateLesson(
        groupId,
        periodId,
        created.lesson.publicId,
        {
          lessonDate: "2026-10-20",
          disciplineId: "notassigned0",
          lessonType: "seminar",
        },
        "2026-08-08",
      ),
    ).rejects.toMatchObject({ code: "discipline_not_assigned" });
  });

  it("deletes a lesson together with attendance and blocks mutations after the period", async () => {
    const created = await service.createLesson(groupId, periodId, {
      lessonDate: "2026-09-15",
      disciplineId,
      lessonType: "lecture",
      attendance: [],
    });
    repository.period.endsOn = "2026-08-07";

    await expect(
      service.updateLessonAttendance(
        groupId,
        periodId,
        created.lesson.publicId,
        { attendance: [] },
        "2026-08-08",
      ),
    ).rejects.toMatchObject({ code: "period_completed" });
    await expect(
      service.updateLesson(
        groupId,
        periodId,
        created.lesson.publicId,
        {
          lessonDate: "2026-08-07",
          disciplineId,
          lessonType: "practice",
        },
        "2026-08-08",
      ),
    ).rejects.toMatchObject({ code: "period_completed" });
    await expect(
      service.deleteLesson(
        groupId,
        periodId,
        created.lesson.publicId,
        "2026-08-08",
      ),
    ).rejects.toMatchObject({ code: "period_completed" });

    repository.period.endsOn = "2026-12-31";
    await service.deleteLesson(
      groupId,
      periodId,
      created.lesson.publicId,
      "2026-08-08",
    );
    expect(repository.created).toHaveLength(0);
  });
});
