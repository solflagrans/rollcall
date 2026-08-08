import { entityReferenceSchema } from "@/features/groups/schemas";
import { getPeriodStatus } from "@/features/groups/domain/periods";
import {
  lessonAttendanceUpdateSchema,
  lessonFormSchema,
  lessonUpdateSchema,
} from "@/features/lessons/schemas";
import { LessonsServiceError } from "@/features/lessons/server/errors";
import type {
  LessonCreationContext,
  LessonsRepository,
} from "@/features/lessons/server/repository";
import type {
  CreateLessonInput,
  UpdateLessonAttendanceInput,
  UpdateLessonInput,
} from "@/features/lessons/schemas";
import { selectJournalMembers } from "@/features/lessons/domain/lessons";
import { isForeignKeyViolation } from "@/server/db/errors";

export class LessonsService {
  constructor(private readonly repository: LessonsRepository) {}

  async getCreationContext(
    groupReference: string,
    periodReference: string,
  ): Promise<LessonCreationContext | undefined> {
    const groupRef = entityReferenceSchema.safeParse(groupReference);
    const periodRef = entityReferenceSchema.safeParse(periodReference);
    if (!groupRef.success || !periodRef.success) return undefined;

    const context = await this.repository.findGroupPeriod(
      groupRef.data,
      periodRef.data,
    );
    if (!context) return undefined;
    if (!context.period) {
      return {
        group: context.group,
        period: undefined,
        disciplines: [],
        activeMembers: [],
      };
    }

    const [disciplines, activeMembers] = await Promise.all([
      this.repository.listPeriodDisciplines(context.group.id, context.period.id),
      this.repository.listActiveMembers(context.group.id),
    ]);
    return { ...context, period: context.period, disciplines, activeMembers };
  }

  async createLesson(
    groupReference: string,
    periodReference: string,
    input: CreateLessonInput,
  ) {
    const values = lessonFormSchema.parse(input);
    const { group, period } = await this.requireGroupPeriod(
      groupReference,
      periodReference,
    );

    if (values.lessonDate < period.startsOn || values.lessonDate > period.endsOn) {
      throw new LessonsServiceError("date_outside_period", {
        startsOn: period.startsOn,
        endsOn: period.endsOn,
      });
    }

    const disciplines = await this.repository.listPeriodDisciplines(
      group.id,
      period.id,
    );
    const discipline = disciplines.find(
      (candidate) =>
        candidate.id === values.disciplineId ||
        candidate.publicId === values.disciplineId,
    );
    if (!discipline) {
      throw new LessonsServiceError("discipline_not_assigned");
    }

    const activeMembers = await this.repository.listActiveMembers(group.id);
    const attendance = activeMembers.map((member) => {
      const submitted = values.attendance.find(
        (entry) =>
          entry.groupMemberId === member.id ||
          entry.groupMemberId === member.publicId,
      );
      return {
        groupMemberId: member.id,
        status: submitted?.status ?? null,
        comment: submitted?.comment ?? null,
      };
    });

    try {
      const created = await this.repository.insertLessonWithAttendance(
        period.id,
        discipline.id,
        {
          lessonDate: values.lessonDate,
          lessonType: values.lessonType,
        },
        attendance,
      );
      return { group, period, discipline, ...created };
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new LessonsServiceError("context_changed");
      }
      throw error;
    }
  }

  async getJournal(groupId: string, periodId: string) {
    const { activeMembers, lessonRows, attendanceRows } =
      await this.repository.getPeriodJournalRows(groupId, periodId);
    const attendanceByLesson = new Map<string, typeof attendanceRows>();
    for (const row of attendanceRows) {
      const current = attendanceByLesson.get(row.attendance.lessonId) ?? [];
      current.push(row);
      attendanceByLesson.set(row.attendance.lessonId, current);
    }

    const lessons = lessonRows.map(({ lesson, discipline }) => ({
      ...lesson,
      discipline,
      attendance: attendanceByLesson.get(lesson.id) ?? [],
    }));
    const members = selectJournalMembers(
      activeMembers,
      attendanceRows.map(({ member }) => member),
    );
    return { lessons, members };
  }

  getCompletedMemberAttendance(periodId: string, memberId: string) {
    return this.repository.listCompletedMemberAttendance(periodId, memberId);
  }

  getMemberAttendancePeriodIds(memberId: string) {
    return this.repository.listMemberAttendancePeriodIds(memberId);
  }

  async getLessonContext(
    groupReference: string,
    periodReference: string,
    lessonReference: string,
  ) {
    const groupRef = entityReferenceSchema.safeParse(groupReference);
    const periodRef = entityReferenceSchema.safeParse(periodReference);
    const lessonRef = entityReferenceSchema.safeParse(lessonReference);
    if (!groupRef.success || !periodRef.success) return undefined;

    const context = await this.repository.findGroupPeriod(
      groupRef.data,
      periodRef.data,
    );
    if (!context) return undefined;
    if (!context.period) {
      return {
        ...context,
        disciplines: [],
        lesson: undefined,
        attendance: [],
      };
    }
    if (!lessonRef.success) {
      return {
        ...context,
        disciplines: [],
        lesson: undefined,
        attendance: [],
      };
    }
    const [disciplines, lessonData] = await Promise.all([
      this.repository.listPeriodDisciplines(context.group.id, context.period.id),
      this.repository.findLessonWithAttendance(context.period.id, lessonRef.data),
    ]);
    if (!lessonData) {
      return { ...context, disciplines, lesson: undefined, attendance: [] };
    }
    return {
      ...context,
      disciplines,
      lesson: { ...lessonData.lesson, discipline: lessonData.discipline },
      attendance: lessonData.attendance,
    };
  }

  async updateLessonAttendance(
    groupReference: string,
    periodReference: string,
    lessonReference: string,
    input: UpdateLessonAttendanceInput,
    today: string,
  ) {
    const values = lessonAttendanceUpdateSchema.parse(input);
    const { group, period } = await this.requireGroupPeriod(
      groupReference,
      periodReference,
    );
    this.requireEditablePeriod(period, today);
    const reference = entityReferenceSchema.parse(lessonReference);
    const lessonData = await this.repository.findLessonWithAttendance(
      period.id,
      reference,
    );
    if (!lessonData) throw new LessonsServiceError("lesson_not_found");

    const attendance = lessonData.attendance.map(({ attendance: entry, member }) => {
      const submitted = values.attendance.find(
        (candidate) =>
          candidate.groupMemberId === member.id ||
          candidate.groupMemberId === member.publicId,
      );
      return {
        groupMemberId: member.id,
        status: submitted ? submitted.status : entry.status,
        comment: submitted ? submitted.comment : entry.comment,
      };
    });
    const updated = await this.repository.updateLessonAttendance(
      lessonData.lesson.id,
      attendance,
    );
    return { group, period, lesson: lessonData.lesson, attendance: updated };
  }

  async updateLesson(
    groupReference: string,
    periodReference: string,
    lessonReference: string,
    input: UpdateLessonInput,
    today: string,
  ) {
    const values = lessonUpdateSchema.parse(input);
    const { group, period } = await this.requireGroupPeriod(
      groupReference,
      periodReference,
    );
    this.requireEditablePeriod(period, today);
    const reference = entityReferenceSchema.parse(lessonReference);
    const [lessonRow, disciplines] = await Promise.all([
      this.repository.findLesson(period.id, reference),
      this.repository.listPeriodDisciplines(group.id, period.id),
    ]);
    if (!lessonRow) throw new LessonsServiceError("lesson_not_found");

    if (values.lessonDate < period.startsOn || values.lessonDate > period.endsOn) {
      throw new LessonsServiceError("date_outside_period", {
        startsOn: period.startsOn,
        endsOn: period.endsOn,
      });
    }

    const discipline = disciplines.find(
      (candidate) =>
        candidate.id === values.disciplineId ||
        candidate.publicId === values.disciplineId,
    );
    if (!discipline) {
      throw new LessonsServiceError("discipline_not_assigned");
    }

    try {
      const lesson = await this.repository.updateLesson(
        lessonRow.lesson.id,
        discipline.id,
        {
          lessonDate: values.lessonDate,
          lessonType: values.lessonType,
        },
      );
      if (!lesson) throw new LessonsServiceError("lesson_not_found");
      return { group, period, lesson, discipline };
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new LessonsServiceError("context_changed");
      }
      throw error;
    }
  }

  async deleteLesson(
    groupReference: string,
    periodReference: string,
    lessonReference: string,
    today: string,
  ) {
    const { group, period } = await this.requireGroupPeriod(
      groupReference,
      periodReference,
    );
    this.requireEditablePeriod(period, today);
    const reference = entityReferenceSchema.parse(lessonReference);
    const lessonRow = await this.repository.findLesson(period.id, reference);
    if (!lessonRow) throw new LessonsServiceError("lesson_not_found");
    const lesson = await this.repository.deleteLessonWithAttendance(
      lessonRow.lesson.id,
    );
    if (!lesson) throw new LessonsServiceError("lesson_not_found");
    return { group, period, lesson };
  }

  private async requireGroupPeriod(
    groupReference: string,
    periodReference: string,
  ) {
    const group = entityReferenceSchema.parse(groupReference);
    const period = entityReferenceSchema.parse(periodReference);
    const context = await this.repository.findGroupPeriod(group, period);
    if (!context) throw new LessonsServiceError("group_not_found");
    if (!context.period) throw new LessonsServiceError("period_not_found");
    return { group: context.group, period: context.period };
  }

  private requireEditablePeriod(
    period: { startsOn: string; endsOn: string },
    today: string,
  ) {
    if (getPeriodStatus(period.startsOn, period.endsOn, today) === "completed") {
      throw new LessonsServiceError("period_completed");
    }
  }
}
