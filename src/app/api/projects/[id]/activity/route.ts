import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { requireProjectAccess } from "@/lib/permissions";
import { toActivityDTO } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await requireProjectAccess(id, user.id);

    const takeParam = Number(request.nextUrl.searchParams.get("take") ?? 40);
    const take = Number.isFinite(takeParam)
      ? Math.min(Math.max(Math.trunc(takeParam), 1), 100)
      : 40;

    const activities = await prisma.activity.findMany({
      where: { projectId: id },
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take,
    });

    return json({ activities: activities.map(toActivityDTO) });
  } catch (error) {
    return handleError(error);
  }
}
