import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

export async function POST() {
  try {
    const user = await requireUser();

    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    return json({ ok: true, unread: 0 });
  } catch (error) {
    return handleError(error);
  }
}
