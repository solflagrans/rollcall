import { assertPermission, hasPermission } from ".";

describe("permissions", () => {
  it("gives headman and deputy identical administrative access", () => {
    for (const permission of ["group.manage", "students.manage", "subjects.manage", "attendance.manage", "attendance.readGroup"] as const) {
      expect(hasPermission("headman", permission)).toBe(true);
      expect(hasPermission("deputy", permission)).toBe(true);
    }
  });
  it("limits a student to own attendance", () => {
    expect(hasPermission("student", "attendance.readOwn")).toBe(true);
    expect(hasPermission("student", "attendance.readGroup")).toBe(false);
  });
  it("rejects cross-group and inactive access", () => {
    expect(() => assertPermission({ isActive: true, role: "headman", groupId: "a" }, "students.manage", "b")).toThrow("GROUP_SCOPE_VIOLATION");
    expect(() => assertPermission({ isActive: false, role: "headman", groupId: "a" }, "students.manage", "a")).toThrow("ACCOUNT_INACTIVE");
  });
});
