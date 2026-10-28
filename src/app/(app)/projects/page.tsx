import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toProjectSummaryDTO } from "@/lib/serializers";
import { ProjectsView } from "@/components/projects/projects-view";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: user.id } } },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarColor: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      _count: { select: { tasks: true } },
      tasks: { where: { status: "DONE" }, select: { id: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <ProjectsView
      firstName={user.name.split(" ")[0]}
      projects={projects.map((project) => toProjectSummaryDTO(project, user.id))}
    />
  );
}
