import { entityReferenceSchema } from "@/features/groups/schemas";
import { lessonFormSchema } from "@/features/lessons/schemas";
import { LessonsServiceError } from "@/features/lessons/server/errors";
import type {
  LessonCreationContext,
  LessonsRepository,
} from "@/features/lessons/server/repository";
import type { CreateLessonInput } from "@/features/lessons/schemas";
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

    const group = await this.repository.findGroup(groupRef.data);
    if (!group) return undefined;
    const period = await this.repository.findPeriod(group.id, periodRef.data);
    if (!period) {
      return { group, period: undefined, disciplines: [], activeMembers: [] };
    }

    const [disciplines, activeMembers] = await Promise.all([
      this.repository.listPeriodDisciplines(group.id, period.id),
      this.repository.listActiveMembers(group.id),
    ]);
    return { group, period, disciplines, activeMembers };
  }

  async createLesson(
    groupReference: string,
    periodReference: string,
    input: CreateLessonInput,
  ) {
    const values = lessonFormSchema.parse(input);
    const group = await this.requireGroup(groupReference);
    const period = await this.requirePeriod(group.id, periodReference);

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

  private async requireGroup(groupReference: string) {
    const reference = entityReferenceSchema.parse(groupReference);
    const group = await this.repository.findGroup(reference);
    if (!group) throw new LessonsServiceError("group_not_found");
    return group;
  }

  private async requirePeriod(groupId: string, periodReference: string) {
    const reference = entityReferenceSchema.parse(periodReference);
    const period = await this.repository.findPeriod(groupId, reference);
    if (!period) throw new LessonsServiceError("period_not_found");
    return period;
  }
}
