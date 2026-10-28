import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProjectAccess } from "@/lib/permissions";
import { toBoardDTO } from "@/lib/serializers";
import { BoardView } from "@/components/board/board-view";

export const metadata: Metadata = { title: "Board" };

export default async function ProjectBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ task?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  const access = await getProjectAccess(id, user.id);
  if (!access) notFound();

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarColor: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      tasks: {
        include: {
          assignee: {
            select: { id: true, name: true, email: true, avatarColor: true },
          },
          creator: {
            select: { id: true, name: true, email: true, avatarColor: true },
          },
          _count: { select: { comments: true } },
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!project) notFound();

  const { task } = await searchParams;

  return (
    <div className="flex flex-1 flex-col">
      <BoardView
        initialBoard={toBoardDTO(project, access.role, user.id)}
        initialTaskId={task}
      />
    </div>
  );
}
