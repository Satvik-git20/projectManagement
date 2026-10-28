import "server-only";
import { prisma } from "./db";
import { ApiError } from "./api";

export const taskInclude = {
  assignee: {
    select: { id: true, name: true, email: true, avatarColor: true },
  },
  creator: {
    select: { id: true, name: true, email: true, avatarColor: true },
  },
  _count: { select: { comments: true } },
} as const;

export function parseDueDate(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const date = new Date(`${value}T17:00:00`);
  if (Number.isNaN(date.getTime())) throw new ApiError(422, "Invalid due date");
  return date;
}

export async function assertProjectMember(projectId: string, userId: string) {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { id: true },
  });
  if (!membership) {
    throw new ApiError(422, "That person isn't on this project");
  }
}
