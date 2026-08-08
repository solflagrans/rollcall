import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DrizzleRollcallRepository } from "@/features/groups/server/drizzle-repository";
import { DrizzleLessonsRepository } from "@/features/lessons/server/drizzle-repository";

const runIntegration = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!runIntegration)("Drizzle read models", () => {
  it("loads group, period, lesson context and journal from PostgreSQL", async () => {
    const groupsRepository = new DrizzleRollcallRepository();
    const lessonsRepository = new DrizzleLessonsRepository();
    const groups = await groupsRepository.listGroups();
    expect(groups.length).toBeGreaterThan(0);

    const group = groups[0]!;
    const groupContext = await groupsRepository.findGroupWithPeriods(group.publicId);
    expect(groupContext?.group.id).toBe(group.id);
    const period = groupContext?.periods[0];
    if (!period) return;

    const groupPeriod = await lessonsRepository.findGroupPeriod(
      group.publicId,
      period.publicId,
    );
    expect(groupPeriod?.period?.id).toBe(period.id);

    const journal = await lessonsRepository.getPeriodJournalRows(
      group.id,
      period.id,
    );
    expect(Array.isArray(journal.activeMembers)).toBe(true);
    expect(Array.isArray(journal.lessonRows)).toBe(true);
    expect(Array.isArray(journal.attendanceRows)).toBe(true);

    const lesson = journal.lessonRows[0]?.lesson;
    if (!lesson) return;
    const lessonContext = await lessonsRepository.findLessonWithAttendance(
      period.id,
      lesson.publicId,
    );
    expect(lessonContext?.lesson.id).toBe(lesson.id);
  });
});
