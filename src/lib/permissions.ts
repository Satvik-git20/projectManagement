import "server-only";
import { prisma } from "./db";
import { ApiError } from "./api";
import { ROLE_RANK, type Role } from "./constants";

export async function getProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { where: { userId }, select: { role: true } } },
  });

  if (!project) return null;
  const membership = project.members[0];
  if (!membership) return null;

  return { project, role: membership.role as Role, userId };
}

/**
 * Resolves the caller's membership or throws. A non-member gets 404 rather
 * than 403 so project ids can't be probed.
 */
export async function requireProjectAccess(
  projectId: string,
  userId: string,
  minRole: Role = "MEMBER",
) {
  const access = await getProjectAccess(projectId, userId);

  if (!access) {
    throw new ApiError(404, "Project not found");
  }

  if (ROLE_RANK[access.role] < ROLE_RANK[minRole]) {
    throw new ApiError(403, "You don't have permission to do that");
  }

  return access;
}

export async function requireTaskAccess(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: { members: { where: { userId }, select: { role: true } } },
      },
    },
  });

  const membership = task?.project.members[0];
  if (!task || !membership) {
    throw new ApiError(404, "Task not found");
  }

  return { task, role: membership.role as Role, project: task.project };
}

export function canManage(role: Role) {
  return ROLE_RANK[role] >= ROLE_RANK.ADMIN;
}

export function canDeleteTask(
  task: { creatorId: string; assigneeId: string | null },
  userId: string,
  role: Role,
) {
  return (
    canManage(role) ||
    task.creatorId === userId ||
    task.assigneeId === userId
  );
}
