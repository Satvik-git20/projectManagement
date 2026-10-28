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
import { canManage } from "@/lib/permissions";
import { updateCommentSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";
import { emitToProject } from "@/lib/realtime";
import { toCommentDTO } from "@/lib/serializers";
import type { Role } from "@/lib/constants";

type Context = { params: Promise<{ id: string }> };

async function requireCommentAccess(commentId: string, userId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      author: {
        select: { id: true, name: true, email: true, avatarColor: true },
      },
      task: {
        select: {
          id: true,
          title: true,
          projectId: true,
          project: {
            select: {
              members: { where: { userId }, select: { role: true } },
            },
          },
        },
      },
    },
  });

  const membership = comment?.task.project.members[0];
  if (!comment || !membership) {
    throw new ApiError(404, "Comment not found");
  }

  return { comment, role: membership.role as Role };
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const { comment } = await requireCommentAccess(id, user.id);

    if (comment.authorId !== user.id) {
      throw new ApiError(403, "You can only edit your own comments");
    }

    const input = await parseBody(request, updateCommentSchema);

    const updated = await prisma.comment.update({
      where: { id },
      data: { body: input.body, editedAt: new Date() },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarColor: true },
        },
      },
    });

    emitToProject(comment.task.projectId, "comment:updated", {
      comment: toCommentDTO(updated),
      taskId: comment.taskId,
    });

    return json({ comment: toCommentDTO(updated) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const { comment, role } = await requireCommentAccess(id, user.id);

    if (comment.authorId !== user.id && !canManage(role)) {
      throw new ApiError(403, "You can only delete your own comments");
    }

    await prisma.comment.delete({ where: { id } });

    await logActivity({
      projectId: comment.task.projectId,
      taskId: comment.task.id,
      actor: user,
      type: "comment.deleted",
      message: `deleted a comment on "${comment.task.title}"`,
    });

    emitToProject(comment.task.projectId, "comment:deleted", {
      id,
      taskId: comment.task.id,
      authorId: comment.authorId,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
