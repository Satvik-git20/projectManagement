import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  ApiError,
  assertSameOrigin,
  handleError,
  json,
  parseBody,
} from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { emitToProject } from "@/lib/realtime";

const joinSchema = z.object({
  code: z.string().trim().min(3, "Enter a join code").max(24),
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await parseBody(request, joinSchema);

    const project = await prisma.project.findUnique({
      where: { joinCode: input.code.toUpperCase() },
      select: { id: true, name: true },
    });

    if (!project) {
      throw new ApiError(404, "That join code doesn't match a project");
    }

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: user.id } },
      select: { id: true },
    });

    if (!existing) {
      await prisma.projectMember.create({
        data: { projectId: project.id, userId: user.id, role: "MEMBER" },
      });

      await logActivity({
        projectId: project.id,
        actor: user,
        type: "member.added",
        message: "joined the project",
      });

      emitToProject(project.id, "member:added", {
        userId: user.id,
        name: user.name,
      });
    }

    return json({
      projectId: project.id,
      projectName: project.name,
      alreadyMember: Boolean(existing),
    });
  } catch (error) {
    return handleError(error);
  }
}
