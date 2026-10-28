import { describe, expect, it } from "vitest";
import {
  applyMove,
  byPosition,
  completionPercent,
  midpointPosition,
  tasksInColumn,
} from "@/lib/board-utils";
import type { TaskDTO } from "@/lib/types";

let counter = 0;

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  counter += 1;
  return {
    id: `task-${counter}`,
    projectId: "project-1",
    title: `Task ${counter}`,
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    position: 1000,
    dueDate: null,
    completedAt: null,
    createdAt: new Date(2026, 0, counter).toISOString(),
    updatedAt: new Date(2026, 0, counter).toISOString(),
    assignee: null,
    creator: {
      id: "user-1",
      name: "Maya Chen",
      email: "maya@taskflow.dev",
      avatarColor: "#6366f1",
    },
    commentCount: 0,
    ...overrides,
  };
}

describe("midpointPosition", () => {
  it("splits the gap between two neighbours", () => {
    const before = makeTask({ position: 1000 });
    const after = makeTask({ position: 2000 });
    expect(midpointPosition(before, after)).toBe(1500);
  });

  it("appends when only a preceding card exists", () => {
    expect(midpointPosition(makeTask({ position: 40 }), undefined)).toBe(41);
  });

  it("prepends when only a following card exists", () => {
    expect(midpointPosition(undefined, makeTask({ position: 40 }))).toBe(39);
  });

  it("starts a column at 1", () => {
    expect(midpointPosition(undefined, undefined)).toBe(1);
  });
});

describe("applyMove", () => {
  it("moves a task between columns and stamps completion", () => {
    const task = makeTask({ id: "moving", status: "TODO", position: 1000 });
    const target = makeTask({ id: "anchor", status: "DONE", position: 5000 });

    const result = applyMove([task, target], "moving", "DONE", target.id, null);

    const moved = result.find((item) => item.id === "moving");
    expect(moved?.status).toBe("DONE");
    expect(moved?.position).toBe(5001);
    expect(moved?.completedAt).not.toBeNull();
  });

  it("clears completion when a card leaves Done", () => {
    const task = makeTask({
      id: "moving",
      status: "DONE",
      completedAt: new Date().toISOString(),
      position: 1000,
    });

    const [moved] = applyMove([task], "moving", "IN_PROGRESS", null, null);
    expect(moved.status).toBe("IN_PROGRESS");
    expect(moved.completedAt).toBeNull();
  });

  it("ignores unknown tasks", () => {
    const tasks = [makeTask({ id: "a" })];
    expect(applyMove(tasks, "missing", "DONE", null, null)).toBe(tasks);
  });

  it("orders the returned array by position", () => {
    const task = makeTask({ id: "moving", status: "TODO", position: 9000 });
    const first = makeTask({ id: "first", status: "DONE", position: 1000 });
    const second = makeTask({ id: "second", status: "DONE", position: 2000 });

    const result = applyMove([task, first, second], "moving", "DONE", null, null);
    expect(result.map((item) => item.id)).toEqual([
      "moving",
      "first",
      "second",
    ]);
  });
});

describe("tasksInColumn", () => {
  it("filters by status and sorts by position then creation time", () => {
    const a = makeTask({ status: "TODO", position: 200 });
    const b = makeTask({ status: "TODO", position: 100 });
    const c = makeTask({ status: "DONE", position: 50 });

    expect(tasksInColumn([a, b, c], "TODO").map((task) => task.id)).toEqual([
      b.id,
      a.id,
    ]);
  });

  it("falls back to creation time when positions tie", () => {
    const older = makeTask({
      position: 10,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const newer = makeTask({
      position: 10,
      createdAt: "2026-02-01T00:00:00.000Z",
    });

    const sorted = [newer, older].sort(byPosition);
    expect(sorted[0].id).toBe(older.id);
  });
});

describe("completionPercent", () => {
  it("is zero for an empty board", () => {
    expect(completionPercent([])).toBe(0);
  });

  it("rounds the done ratio", () => {
    const tasks = [
      makeTask({ status: "DONE" }),
      makeTask({ status: "DONE" }),
      makeTask({ status: "TODO" }),
    ];
    expect(completionPercent(tasks)).toBe(67);
  });
});
