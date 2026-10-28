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
import { requireProjectAccess } from "@/lib/permissions";
import { updateMemberRoleSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";
import { emitToProject } from "@/lib/realtime";

type Context = { params: Promise<{ id: string; userId: string }> };

async function targetMembership(projectId: string, userId: string) {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!membership) throw new ApiError(404, "That person isn't on this project");
  return membership;
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id, userId } = await context.params;
    const access = await requireProjectAccess(id, user.id, "ADMIN");
    const input = await parseBody(request, updateMemberRoleSchema);

    const membership = await targetMembership(id, userId);

    if (membership.role === "OWNER") {
      throw new ApiError(403, "The owner's role can't be changed");
    }

    if (access.role !== "OWNER" && membership.role === "ADMIN") {
      throw new ApiError(403, "Only the owner can change another admin's role");
    }

    const updated = await prisma.projectMember.update({
      where: { id: membership.id },
      data: { role: input.role },
    });

    await logActivity({
      projectId: id,
      actor: user,
      type: "member.role",
      message: `made ${membership.user.name} ${input.role.toLowerCase()}`,
    });

    emitToProject(id, "member:updated", {
      userId,
      role: updated.role,
    });

    return json({ ok: true, role: updated.role });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id, userId } = await context.params;
    const access = await requireProjectAccess(id, user.id);
    const membership = await targetMembership(id, userId);

    if (membership.role === "OWNER") {
      throw new ApiError(403, "The project owner can't leave the project");
    }

    const isSelf = userId === user.id;
    const canRemove =
      isSelf ||
      access.role === "OWNER" ||
      (access.role === "ADMIN" && membership.role === "MEMBER");

    if (!canRemove) {
      throw new ApiError(403, "You don't have permission to remove them");
    }

    await prisma.projectMember.delete({ where: { id: membership.id } });

    await logActivity({
      projectId: id,
      actor: user,
      type: "member.removed",
      message: isSelf
        ? "left the project"
        : `removed ${membership.user.name} from the project`,
    });

    emitToProject(id, "member:removed", {
      userId,
      name: membership.user.name,
    });

    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
