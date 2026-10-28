import { describe, expect, it } from "vitest";
import {
  createCommentSchema,
  createProjectSchema,
  createTaskSchema,
  loginSchema,
  moveTaskSchema,
  registerSchema,
  updateTaskSchema,
} from "@/lib/validation";
import { initials, colorFor, formatDueDate, isOverdue } from "@/lib/utils";

describe("registerSchema", () => {
  it("normalises the email and trims the name", () => {
    const parsed = registerSchema.parse({
      name: "  Ada Lovelace  ",
      email: "  ADA@Example.COM ",
      password: "password123",
    });
    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.name).toBe("Ada Lovelace");
  });

  it("rejects short passwords", () => {
    const result = registerSchema.safeParse({
      name: "Ada",
      email: "ada@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects malformed emails", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});

describe("task schemas", () => {
  it("defaults optional task fields", () => {
    const parsed = createTaskSchema.parse({ title: "  Ship it  " });
    expect(parsed.title).toBe("Ship it");
    expect(parsed.description).toBe("");
  });

  it("rejects empty titles and unknown statuses", () => {
    expect(createTaskSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(
      createTaskSchema.safeParse({ title: "Fine", status: "ARCHIVED" }).success,
    ).toBe(false);
  });

  it("rejects an empty update", () => {
    expect(updateTaskSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a move with null neighbours", () => {
    expect(
      moveTaskSchema.safeParse({
        status: "DONE",
        beforeId: null,
        afterId: null,
      }).success,
    ).toBe(true);
  });

  it("only accepts ISO date-only due dates", () => {
    expect(
      createTaskSchema.safeParse({ title: "x", dueDate: "2026-12-01" }).success,
    ).toBe(true);
    expect(
      createTaskSchema.safeParse({ title: "x", dueDate: "01/12/2026" }).success,
    ).toBe(false);
  });

  it("trims comments and rejects whitespace-only bodies", () => {
    expect(createCommentSchema.parse({ body: "  hello  " }).body).toBe("hello");
    expect(createCommentSchema.safeParse({ body: "   " }).success).toBe(false);
  });
});

describe("project schema", () => {
  it("requires a meaningful name", () => {
    expect(createProjectSchema.safeParse({ name: "A" }).success).toBe(false);
    expect(createProjectSchema.safeParse({ name: "Website" }).success).toBe(true);
  });

  it("validates hex colours", () => {
    expect(
      createProjectSchema.safeParse({ name: "Website", color: "#ffffff" }).success,
    ).toBe(true);
    expect(
      createProjectSchema.safeParse({ name: "Website", color: "red" }).success,
    ).toBe(false);
  });
});

describe("formatting helpers", () => {
  it("builds initials from up to two names", () => {
    expect(initials("Maya Chen")).toBe("MC");
    expect(initials("Ada")).toBe("A");
    expect(initials("  ")).toBe("");
  });

  it("assigns a stable colour per seed", () => {
    expect(colorFor("maya@taskflow.dev")).toBe(colorFor("maya@taskflow.dev"));
    expect(colorFor("a@b.com")).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("formats and flags due dates", () => {
    expect(formatDueDate(null)).toBeNull();
    expect(isOverdue(null)).toBe(false);
    expect(isOverdue("2000-01-01T00:00:00.000Z")).toBe(true);
  });
});
