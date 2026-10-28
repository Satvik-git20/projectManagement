import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, handleError, json, parseBody } from "@/lib/api";
import { createProjectSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";
import { toProjectSummaryDTO } from "@/lib/serializers";
import { colorFor } from "@/lib/utils";

function makeJoinCode(name: string) {
  const prefix =
    name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() || "PRJ";
  return `${prefix}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

async function uniqueJoinCode(name: string) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = makeJoinCode(name);
    const existing = await prisma.project.findUnique({
      where: { joinCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  return `${makeJoinCode(name)}-${crypto.randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
}

const summaryInclude = {
  members: {
    include: {
      user: { select: { id: true, name: true, email: true, avatarColor: true } },
    },
    orderBy: { joinedAt: "asc" as const },
  },
  _count: { select: { tasks: true } },
  tasks: { where: { status: "DONE" }, select: { id: true } },
};

export async function GET() {
  try {
    const user = await requireUser();

    const projects = await prisma.project.findMany({
      where: { members: { some: { userId: user.id } } },
      include: summaryInclude,
      orderBy: { updatedAt: "desc" },
    });

    return json({
      projects: projects.map((project) =>
        toProjectSummaryDTO(project, user.id),
      ),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await parseBody(request, createProjectSchema);

    const project = await prisma.project.create({
      data: {
        name: input.name,
        description: input.description,
        color: input.color ?? colorFor(input.name),
        joinCode: await uniqueJoinCode(input.name),
        ownerId: user.id,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
      include: summaryInclude,
    });

    await logActivity({
      projectId: project.id,
      actor: user,
      type: "project.created",
      message: "created the project",
    });

    return json(
      { project: toProjectSummaryDTO(project, user.id) },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}
