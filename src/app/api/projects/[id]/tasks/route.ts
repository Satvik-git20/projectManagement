import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  assertSameOrigin,
  handleError,
  json,
  parseBody,
} from "@/lib/api";
import { requireProjectAccess } from "@/lib/permissions";
import { createTaskSchema } from "@/lib/validation";
import { computePosition } from "@/lib/positions";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";
import { emitToProject } from "@/lib/realtime";
import { toTaskDTO } from "@/lib/serializers";
import { assertProjectMember, parseDueDate, taskInclude } from "@/lib/task-helpers";
import { STATUS_META, type Status } from "@/lib/constants";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    await requireProjectAccess(id, user.id);
    const input = await parseBody(request, createTaskSchema);

    if (input.assigneeId) {
      await assertProjectMember(id, input.assigneeId);
    }

    const status: Status = input.status ?? "TODO";
    const position = await computePosition({ projectId: id, status });

    const task = await prisma.task.create({
      data: {
        projectId: id,
        title: input.title,
        description: input.description,
        status,
        priority: input.priority ?? "MEDIUM",
        position,
        assigneeId: input.assigneeId ?? null,
        creatorId: user.id,
        dueDate: parseDueDate(input.dueDate) ?? null,
      },
      include: taskInclude,
    });

    await logActivity({
      projectId: id,
      taskId: task.id,
      actor: user,
      type: "task.created",
      message: `created "${task.title}"`,
    });

    if (task.assigneeId) {
      await notify({
        userId: task.assigneeId,
        actor: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarColor: user.avatarColor,
        },
        projectId: id,
        taskId: task.id,
        type: "task.assigned",
        title: `${user.name} assigned you a task`,
        body: `"${task.title}" in ${STATUS_META[status].label}`,
      });
    }

    const dto = toTaskDTO(task);
    emitToProject(id, "task:created", dto);

    return json({ task: dto }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
