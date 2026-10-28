import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, handleError, json, parseBody } from "@/lib/api";
import { requireTaskAccess } from "@/lib/permissions";
import { createCommentSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";
import { notifyMany } from "@/lib/notifications";
import { emitToProject } from "@/lib/realtime";
import { toCommentDTO } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await requireTaskAccess(id, user.id);

    const comments = await prisma.comment.findMany({
      where: { taskId: id },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarColor: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return json({ comments: comments.map(toCommentDTO) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const { task } = await requireTaskAccess(id, user.id);
    const input = await parseBody(request, createCommentSchema);

    const comment = await prisma.comment.create({
      data: { taskId: id, authorId: user.id, body: input.body },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarColor: true },
        },
      },
    });

    await logActivity({
      projectId: task.projectId,
      taskId: task.id,
      actor: user,
      type: "comment.created",
      message: `commented on "${task.title}"`,
    });

    const actor = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarColor: user.avatarColor,
    };

    await notifyMany([task.assigneeId, task.creatorId], {
      actor,
      projectId: task.projectId,
      taskId: task.id,
      type: "comment.created",
      title: `${user.name} commented`,
      body: `"${task.title}": ${input.body.slice(0, 120)}`,
    });

    const dto = toCommentDTO(comment);
    emitToProject(task.projectId, "comment:created", {
      comment: dto,
      taskId: id,
      actorId: user.id,
    });

    return json({ comment: dto }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
