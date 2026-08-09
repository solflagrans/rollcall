import { describe, expect, it } from "vitest";

import {
  getAuthenticatedHome,
  getMembershipHome,
  isManagerialRole,
  type UserMembership,
} from "@/features/auth/domain/models";

function membership(role: UserMembership["member"]["role"]): UserMembership {
  return {
    group: { id: "group-id", publicId: "group-public", name: "2436" },
    member: { id: "member-id", publicId: "member-public", role },
  };
}

describe("membership access", () => {
  it("treats headman and deputy as managers", () => {
    expect(isManagerialRole("headman")).toBe(true);
    expect(isManagerialRole("deputy")).toBe(true);
    expect(isManagerialRole("student")).toBe(false);
  });

  it("selects a role-specific landing page", () => {
    expect(getMembershipHome(membership("deputy"))).toBe("/groups/group-public");
    expect(getMembershipHome(membership("student"))).toBe(
      "/groups/group-public/student/member-public/attendance",
    );
  });

  it("opens the group picker unless exactly one group is available", () => {
    const onlyMembership = membership("headman");
    expect(getAuthenticatedHome([])).toBe("/groups");
    expect(getAuthenticatedHome([onlyMembership])).toBe("/groups/group-public");
    expect(getAuthenticatedHome([onlyMembership, membership("student")])).toBe(
      "/groups",
    );
  });
});
