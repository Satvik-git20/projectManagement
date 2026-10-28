import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, handleError, json, parseBody } from "@/lib/api";
import { requireTaskAccess } from "@/lib/permissions";
import { moveTaskSchema } from "@/lib/validation";
import { computePosition } from "@/lib/positions";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";
import { emitToProject } from "@/lib/realtime";
import { toTaskDTO } from "@/lib/serializers";
import { taskInclude } from "@/lib/task-helpers";
import { STATUS_META, type Status } from "@/lib/constants";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const { task } = await requireTaskAccess(id, user.id);
    const input = await parseBody(request, moveTaskSchema);

    const status = input.status as Status;
    const movedColumns = status !== task.status;

    const position = await computePosition({
      projectId: task.projectId,
      status,
      beforeId: input.beforeId ?? null,
      afterId: input.afterId ?? null,
    });

    const updated = await prisma.task.update({
      where: { id },
      data: {
        status,
        position,
        completedAt:
          status === "DONE" ? (task.completedAt ?? new Date()) : null,
      },
      include: taskInclude,
    });

    if (movedColumns) {
      await logActivity({
        projectId: task.projectId,
        taskId: task.id,
        actor: user,
        type: "task.moved",
        message: `moved "${updated.title}" to ${STATUS_META[status].label}`,
      });

      if (updated.assigneeId) {
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
          type: "task.moved",
          title: `${user.name} moved a task`,
          body: `"${updated.title}" → ${STATUS_META[status].label}`,
        });
      }
    }

    const dto = toTaskDTO(updated);
    emitToProject(task.projectId, "task:moved", {
      ...dto,
      actorId: user.id,
      previousStatus: task.status,
    });

    return json({ task: dto });
  } catch (error) {
    return handleError(error);
  }
}
