import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  ApiError,
  assertSameOrigin,
  handleError,
  json,
  parseBody,
} from "@/lib/api";
import { canDeleteTask, requireTaskAccess } from "@/lib/permissions";
import { updateTaskSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";
import { emitToProject } from "@/lib/realtime";
import { toCommentDTO, toTaskDTO } from "@/lib/serializers";
import { assertProjectMember, parseDueDate, taskInclude } from "@/lib/task-helpers";
import { STATUS_META, type Status } from "@/lib/constants";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const { task } = await requireTaskAccess(id, user.id);

    const [full, comments] = await Promise.all([
      prisma.task.findUniqueOrThrow({ where: { id }, include: taskInclude }),
      prisma.comment.findMany({
        where: { taskId: id },
        include: {
          author: {
            select: { id: true, name: true, email: true, avatarColor: true },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return json({
      task: toTaskDTO(full),
      comments: comments.map(toCommentDTO),
      projectId: task.projectId,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const { task } = await requireTaskAccess(id, user.id);
    const input = await parseBody(request, updateTaskSchema);

    if (input.assigneeId) {
      await assertProjectMember(task.projectId, input.assigneeId);
    }

    const nextStatus = (input.status ?? task.status) as Status;
    const statusChanged = input.status !== undefined && input.status !== task.status;
    const assigneeChanged =
      input.assigneeId !== undefined && input.assigneeId !== task.assigneeId;

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.assigneeId !== undefined
          ? { assigneeId: input.assigneeId }
          : {}),
        ...(input.dueDate !== undefined
          ? { dueDate: parseDueDate(input.dueDate) ?? null }
          : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
        ...(statusChanged
          ? { completedAt: nextStatus === "DONE" ? new Date() : null }
          : {}),
      },
      include: taskInclude,
    });

    await logActivity({
      projectId: task.projectId,
      taskId: task.id,
      actor: user,
      type: statusChanged ? "task.moved" : "task.updated",
      message: statusChanged
        ? `moved "${updated.title}" to ${STATUS_META[nextStatus].label}`
        : `updated "${updated.title}"`,
    });

    if (assigneeChanged && updated.assigneeId) {
      await notify({
        userId: updated.assigneeId,
        actor: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarColor: user.avatarColor,
        },
        projectId: task.projectId,
        taskId: task.id,
        type: "task.assigned",
        title: `${user.name} assigned you a task`,
        body: `"${updated.title}" is now yours`,
      });
    }

    const dto = toTaskDTO(updated);
    emitToProject(task.projectId, "task:updated", dto);

    return json({ task: dto });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const { task, role } = await requireTaskAccess(id, user.id);

    if (!canDeleteTask(task, user.id, role)) {
      throw new ApiError(
        403,
        "Only the creator, the assignee or a project admin can delete this task",
      );
    }

    await logActivity({
      projectId: task.projectId,
      actor: user,
      type: "task.deleted",
      message: `deleted "${task.title}"`,
    });

    await prisma.task.delete({ where: { id } });

    emitToProject(task.projectId, "task:deleted", {
      id,
      title: task.title,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
