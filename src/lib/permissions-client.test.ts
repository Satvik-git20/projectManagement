import { describe, expect, it } from "vitest";
import { canDeleteTaskAs, canManageRole } from "@/lib/permissions-client";

describe("canManageRole", () => {
  it("lets owners and admins manage a project", () => {
    expect(canManageRole("OWNER")).toBe(true);
    expect(canManageRole("ADMIN")).toBe(true);
  });

  it("keeps plain members from managing", () => {
    expect(canManageRole("MEMBER")).toBe(false);
  });
});

describe("canDeleteTaskAs", () => {
  const task = { creatorId: "creator", assigneeId: "assignee" };

  it("allows admins to delete any card", () => {
    expect(canDeleteTaskAs("ADMIN", task, "stranger")).toBe(true);
  });

  it("allows the creator", () => {
    expect(canDeleteTaskAs("MEMBER", task, "creator")).toBe(true);
  });

  it("allows the assignee", () => {
    expect(canDeleteTaskAs("MEMBER", task, "assignee")).toBe(true);
  });

  it("blocks unrelated members", () => {
    expect(canDeleteTaskAs("MEMBER", task, "someone-else")).toBe(false);
  });

  it("handles unassigned cards", () => {
    expect(
      canDeleteTaskAs("MEMBER", { creatorId: "creator", assigneeId: null }, "other"),
    ).toBe(false);
  });
});
