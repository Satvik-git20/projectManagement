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
import { addMemberSchema } from "@/lib/validation";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";
import { emitToProject } from "@/lib/realtime";
import { toMemberDTO } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await requireProjectAccess(id, user.id);

    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarColor: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return json({ members: members.map(toMemberDTO) });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const access = await requireProjectAccess(id, user.id, "ADMIN");
    const input = await parseBody(request, addMemberSchema);

    const invited = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, name: true, email: true, avatarColor: true },
    });

    if (!invited) {
      throw new ApiError(
        404,
        "No TaskFlow account uses that email yet — ask them to sign up first.",
      );
    }

    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId: invited.id } },
      select: { id: true },
    });
    if (existing) throw new ApiError(409, "They're already on this project");

    const member = await prisma.projectMember.create({
      data: { projectId: id, userId: invited.id, role: "MEMBER" },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarColor: true },
        },
      },
    });

    await logActivity({
      projectId: id,
      actor: user,
      type: "member.added",
      message: `added ${invited.name} to the project`,
    });

    await notify({
      userId: invited.id,
      actor: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarColor: user.avatarColor,
      },
      projectId: id,
      type: "member.added",
      title: `${user.name} added you to ${access.project.name}`,
      body: "You now have access to the board.",
    });

    emitToProject(id, "member:added", toMemberDTO(member));

    return json({ member: toMemberDTO(member) }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
