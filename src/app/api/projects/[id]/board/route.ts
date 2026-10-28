import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, handleError, json } from "@/lib/api";
import { requireProjectAccess } from "@/lib/permissions";
import { toBoardDTO } from "@/lib/serializers";

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
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true, avatarColor: true },
            },
            creator: {
              select: { id: true, name: true, email: true, avatarColor: true },
            },
            _count: { select: { comments: true } },
          },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!project) throw new ApiError(404, "Project not found");

    return json(toBoardDTO(project, access.role, user.id));
  } catch (error) {
    return handleError(error);
  }
}
