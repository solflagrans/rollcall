import { describe, expect, it } from "vitest";

import type { GroupMember } from "@/features/members/domain/members";
import { sortMembers } from "@/features/members/domain/sorting";

const base = {
  groupId: "group",
  isActive: true,
  userId: null,
  createdAt: new Date("2026-08-08T00:00:00Z"),
  updatedAt: new Date("2026-08-08T00:00:00Z"),
} as const;

const members: GroupMember[] = [
  {
    ...base,
    id: "2",
    publicId: "member000002",
    firstName: "Борис",
    lastName: "Яковлев",
    role: "student",
  },
  {
    ...base,
    id: "1",
    publicId: "member000001",
    firstName: "Анна",
    lastName: "Алексеева",
    role: "deputy",
  },
];

describe("member sorting", () => {
  it("sorts by surname ascending by default", () => {
    expect(sortMembers(members, "lastName", "asc").map((member) => member.id)).toEqual([
      "1",
      "2",
    ]);
  });
});
