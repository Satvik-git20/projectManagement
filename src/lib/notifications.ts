import "server-only";
import { prisma } from "./db";
import { emitToUser } from "./realtime";
import { toNotificationDTO } from "./serializers";
import type { PublicUser } from "./types";

type NotifyInput = {
  userId: string;
  actor?: PublicUser | null;
  projectId?: string | null;
  taskId?: string | null;
  type: string;
  title: string;
  body?: string;
};

export async function notify(input: NotifyInput) {
  if (input.actor && input.actor.id === input.userId) return null;

  const created = await prisma.notification.create({
    data: {
      userId: input.userId,
      actorId: input.actor?.id ?? null,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      type: input.type,
      title: input.title.slice(0, 160),
      body: (input.body ?? "").slice(0, 300),
    },
    include: { actor: true },
  });

  emitToUser(input.userId, "notification:new", toNotificationDTO(created));
  return created;
}

export async function notifyMany(
  userIds: (string | null | undefined)[],
  input: Omit<NotifyInput, "userId">,
) {
  const unique = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  await Promise.all(
    unique.map((userId) => notify({ ...input, userId }).catch(() => null)),
  );
}
