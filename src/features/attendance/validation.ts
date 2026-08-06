import { z } from "zod";
import { attendanceStatuses, lessonTypes } from "@/lib/constants";

export const lessonFormSchema = z.object({
  groupId: z.uuid(),
  subjectId: z.uuid(),
  lessonDate: z.iso.date(),
  type: z.enum(lessonTypes),
  comment: z.string().trim().max(500).optional(),
  marks: z.array(z.object({ studentMembershipId: z.uuid(), status: z.enum(attendanceStatuses), comment: z.string().trim().max(300).optional() })).min(1),
});

export type LessonFormValues = z.infer<typeof lessonFormSchema>;
