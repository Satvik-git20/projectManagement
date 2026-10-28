import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { toNotificationDTO } from "@/lib/serializers";

export async function GET() {
  try {
    const user = await requireUser();

    const [notifications, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        include: { actor: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({
        where: { userId: user.id, readAt: null },
      }),
    ]);

    return json({
      notifications: notifications.map(toNotificationDTO),
      unread,
    });
  } catch (error) {
    return handleError(error);
  }
}
