import "server-only";
import { prisma } from "./db";
import { emitToProject } from "./realtime";
import { toActivityDTO } from "./serializers";
import type { PublicUser } from "./types";

type LogActivityInput = {
  projectId: string;
  taskId?: string | null;
  actor: PublicUser;
  type: string;
  message: string;
};

export async function logActivity(input: LogActivityInput) {
  const activity = await prisma.activity.create({
    data: {
      projectId: input.projectId,
      taskId: input.taskId ?? null,
      actorId: input.actor.id,
      type: input.type,
      message: input.message.slice(0, 300),
    },
    include: { actor: true },
  });

  emitToProject(input.projectId, "activity:new", toActivityDTO(activity));
  return activity;
}
