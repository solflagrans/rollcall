import { canDeactivateAdmin, canDeleteMembership, canDeleteSubject } from "./domain";

describe("archiving rules", () => {
  it("only physically deletes memberships without attendance", () => { expect(canDeleteMembership(0)).toBe(true); expect(canDeleteMembership(1)).toBe(false); });
  it("only physically deletes subjects without lessons", () => { expect(canDeleteSubject(0)).toBe(true); expect(canDeleteSubject(2)).toBe(false); });
  it("protects the last active administrator", () => { expect(canDeactivateAdmin(1, true)).toBe(false); expect(canDeactivateAdmin(2, true)).toBe(true); expect(canDeactivateAdmin(1, false)).toBe(true); });
});
