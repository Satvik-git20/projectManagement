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
import {
  requireProjectAccess,
  canManage,
} from "@/lib/permissions";
import { updateProjectSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";
import { emitToProject } from "@/lib/realtime";
import { toMemberDTO } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const access = await requireProjectAccess(id, user.id);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarColor: true },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        _count: { select: { tasks: true } },
      },
    });

    if (!project) throw new ApiError(404, "Project not found");

    return json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        color: project.color,
        joinCode: project.joinCode,
        ownerId: project.ownerId,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
      role: access.role,
      members: project.members.map(toMemberDTO),
      taskCount: project._count.tasks,
      canManage: canManage(access.role),
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
    const access = await requireProjectAccess(id, user.id, "ADMIN");
    const input = await parseBody(request, updateProjectSchema);

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
      },
    });

    await logActivity({
      projectId: id,
      actor: user,
      type: "project.updated",
      message: "updated the project settings",
    });

    emitToProject(id, "project:updated", {
      id: project.id,
      name: project.name,
      description: project.description,
      color: project.color,
    });

    return json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        color: project.color,
        joinCode: project.joinCode,
      },
      role: access.role,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    await requireProjectAccess(id, user.id, "OWNER");

    emitToProject(id, "project:deleted", { id });
    await prisma.project.delete({ where: { id } });

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
