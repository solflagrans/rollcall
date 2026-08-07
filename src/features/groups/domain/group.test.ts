import { describe, expect, it } from "vitest";

import { normalizeGroupName } from "@/features/groups/domain/group";

describe("normalizeGroupName", () => {
  it("trims and collapses repeated whitespace", () => {
    expect(normalizeGroupName("  Магистратура   1\n курс  ")).toBe("Магистратура 1 курс");
  });
});
