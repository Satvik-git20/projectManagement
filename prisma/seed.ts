import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const file = raw.replace(/^file:/, "");
const url = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

const PASSWORD = "password123";

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(17, 0, 0, 0);
  return date;
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.activity.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const [maya, diego, priya, jonas] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Maya Chen",
        email: "maya@taskflow.dev",
        passwordHash,
        avatarColor: "#6366f1",
      },
    }),
    prisma.user.create({
      data: {
        name: "Diego Ramos",
        email: "diego@taskflow.dev",
        passwordHash,
        avatarColor: "#10b981",
      },
    }),
    prisma.user.create({
      data: {
        name: "Priya Nair",
        email: "priya@taskflow.dev",
        passwordHash,
        avatarColor: "#ec4899",
      },
    }),
    prisma.user.create({
      data: {
        name: "Jonas Weber",
        email: "jonas@taskflow.dev",
        passwordHash,
        avatarColor: "#f97316",
      },
    }),
  ]);

  const website = await prisma.project.create({
    data: {
      name: "Website Relaunch",
      description:
        "Marketing site rebuild: new design system, CMS migration and launch plan.",
      color: "#6366f1",
      joinCode: "WEB-8F3K",
      ownerId: maya.id,
      members: {
        create: [
          { userId: maya.id, role: "OWNER" },
          { userId: diego.id, role: "ADMIN" },
          { userId: priya.id, role: "MEMBER" },
          { userId: jonas.id, role: "MEMBER" },
        ],
      },
    },
  });

  const mobile = await prisma.project.create({
    data: {
      name: "Mobile App v2",
      description:
        "Second major release of the mobile client: onboarding, sync, and reliability.",
      color: "#8b5cf6",
      joinCode: "MOB-2Q7T",
      ownerId: maya.id,
      members: {
        create: [
          { userId: maya.id, role: "OWNER" },
          { userId: diego.id, role: "MEMBER" },
          { userId: priya.id, role: "ADMIN" },
        ],
      },
    },
  });

  type SeedTask = {
    projectId: string;
    title: string;
    description?: string;
    status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE";
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    assigneeId?: string;
    creatorId: string;
    dueDate?: Date | null;
    position: number;
  };

  const taskRows: SeedTask[] = [
    // Website Relaunch
    {
      projectId: website.id,
      title: "Audit legacy marketing pages",
      description:
        "Crawl the current site, list every page with traffic, owner and whether it survives the relaunch.",
      status: "BACKLOG",
      priority: "LOW",
      assigneeId: priya.id,
      creatorId: maya.id,
      position: 1000,
    },
    {
      projectId: website.id,
      title: "Set up 301 redirect map",
      description: "Map every retired URL to its replacement before launch day.",
      status: "BACKLOG",
      priority: "MEDIUM",
      assigneeId: diego.id,
      creatorId: maya.id,
      position: 2000,
    },
    {
      projectId: website.id,
      title: "Design new pricing page",
      description:
        "Three-tier layout with annual toggle. Needs sales sign-off on the enterprise copy.",
      status: "TODO",
      priority: "HIGH",
      assigneeId: priya.id,
      creatorId: maya.id,
      dueDate: daysFromNow(3),
      position: 1000,
    },
    {
      projectId: website.id,
      title: "Migrate blog to MDX",
      description: "Move 84 posts into the new content pipeline with redirects.",
      status: "TODO",
      priority: "MEDIUM",
      assigneeId: jonas.id,
      creatorId: diego.id,
      position: 2000,
    },
    {
      projectId: website.id,
      title: "Write launch announcement",
      status: "TODO",
      priority: "LOW",
      assigneeId: maya.id,
      creatorId: maya.id,
      position: 3000,
    },
    {
      projectId: website.id,
      title: "Build responsive navigation",
      description:
        "Mobile drawer, sticky header, keyboard traps. Should collapse at 768px.",
      status: "IN_PROGRESS",
      priority: "URGENT",
      assigneeId: diego.id,
      creatorId: maya.id,
      dueDate: daysFromNow(1),
      position: 1000,
    },
    {
      projectId: website.id,
      title: "Accessibility pass on forms",
      description: "Labels, focus rings, error announcements, contrast ratios.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assigneeId: priya.id,
      creatorId: maya.id,
      dueDate: daysFromNow(2),
      position: 2000,
    },
    {
      projectId: website.id,
      title: "Pick typography scale",
      status: "DONE",
      priority: "MEDIUM",
      assigneeId: maya.id,
      creatorId: maya.id,
      position: 1000,
    },
    {
      projectId: website.id,
      title: "Stakeholder kickoff",
      status: "DONE",
      priority: "LOW",
      assigneeId: maya.id,
      creatorId: maya.id,
      position: 2000,
    },
    // Mobile App v2
    {
      projectId: mobile.id,
      title: "Offline sync strategy",
      description:
        "Decide between last-write-wins and a CRDT for draft notes. Document the tradeoffs.",
      status: "BACKLOG",
      priority: "HIGH",
      assigneeId: diego.id,
      creatorId: maya.id,
      position: 1000,
    },
    {
      projectId: mobile.id,
      title: "Push notification permissions flow",
      description: "Ask after the first useful action, not on cold start.",
      status: "TODO",
      priority: "HIGH",
      assigneeId: priya.id,
      creatorId: maya.id,
      dueDate: daysFromNow(4),
      position: 1000,
    },
    {
      projectId: mobile.id,
      title: "Biometric login",
      status: "TODO",
      priority: "MEDIUM",
      assigneeId: maya.id,
      creatorId: priya.id,
      position: 2000,
    },
    {
      projectId: mobile.id,
      title: "Rewrite onboarding carousel",
      description: "Three screens, skippable, remembers progress.",
      status: "IN_PROGRESS",
      priority: "URGENT",
      assigneeId: priya.id,
      creatorId: maya.id,
      dueDate: daysFromNow(1),
      position: 1000,
    },
    {
      projectId: mobile.id,
      title: "Crash reporting integration",
      status: "DONE",
      priority: "MEDIUM",
      assigneeId: diego.id,
      creatorId: maya.id,
      position: 1000,
    },
  ];

  const tasks: Record<string, { id: string }> = {};
  for (const row of taskRows) {
    const created = await prisma.task.create({ data: row });
    tasks[row.title] = created;
  }

  await prisma.task.updateMany({
    where: { status: "DONE" },
    data: { completedAt: new Date() },
  });

  await prisma.comment.createMany({
    data: [
      {
        taskId: tasks["Build responsive navigation"].id,
        authorId: maya.id,
        body: "The drawer animation feels heavy on mid-range phones — can we drop to a 180ms ease-out?",
      },
      {
        taskId: tasks["Build responsive navigation"].id,
        authorId: diego.id,
        body: "Agreed. Also found that focus escapes to the header when the drawer closes. Fixing today.",
      },
      {
        taskId: tasks["Design new pricing page"].id,
        authorId: priya.id,
        body: "Draft is in Figma. Enterprise tier needs a real number before I can lock the layout.",
      },
      {
        taskId: tasks["Rewrite onboarding carousel"].id,
        authorId: priya.id,
        body: "Copy is final. Waiting on the illustration set from brand.",
      },
    ],
  });

  await prisma.activity.createMany({
    data: [
      {
        projectId: website.id,
        actorId: maya.id,
        type: "project.created",
        message: "created the project",
      },
      {
        projectId: website.id,
        taskId: tasks["Build responsive navigation"].id,
        actorId: maya.id,
        type: "task.created",
        message: 'created "Build responsive navigation"',
      },
      {
        projectId: website.id,
        taskId: tasks["Build responsive navigation"].id,
        actorId: diego.id,
        type: "task.moved",
        message: 'moved "Build responsive navigation" to In progress',
      },
      {
        projectId: website.id,
        taskId: tasks["Design new pricing page"].id,
        actorId: priya.id,
        type: "comment.created",
        message: 'commented on "Design new pricing page"',
      },
      {
        projectId: website.id,
        taskId: tasks["Pick typography scale"].id,
        actorId: maya.id,
        type: "task.moved",
        message: 'completed "Pick typography scale"',
      },
      {
        projectId: mobile.id,
        actorId: maya.id,
        type: "project.created",
        message: "created the project",
      },
      {
        projectId: mobile.id,
        taskId: tasks["Rewrite onboarding carousel"].id,
        actorId: priya.id,
        type: "task.moved",
        message: 'moved "Rewrite onboarding carousel" to In progress',
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: maya.id,
        actorId: diego.id,
        projectId: website.id,
        taskId: tasks["Build responsive navigation"].id,
        type: "comment.created",
        title: "Diego Ramos commented",
        body: 'on "Build responsive navigation": Agreed. Also found that focus escapes…',
        createdAt: new Date(Date.now() - 1000 * 60 * 24),
      },
      {
        userId: maya.id,
        actorId: priya.id,
        projectId: mobile.id,
        taskId: tasks["Rewrite onboarding carousel"].id,
        type: "task.moved",
        title: "Priya Nair moved a task",
        body: '"Rewrite onboarding carousel" is now In progress',
        readAt: new Date(Date.now() - 1000 * 60 * 60 * 20),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26),
      },
      {
        userId: maya.id,
        actorId: priya.id,
        projectId: website.id,
        taskId: tasks["Design new pricing page"].id,
        type: "task.assigned",
        title: "Priya Nair assigned you a task",
        body: '"Design new pricing page" is due in 3 days',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
      },
    ],
  });

  console.log(`Seeded ${taskRows.length} tasks across 2 projects.`);
  console.log(`Demo login: maya@taskflow.dev / ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
