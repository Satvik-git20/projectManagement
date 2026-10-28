import "server-only";
import { prisma } from "./db";
import type { Status } from "./constants";

const MIN_GAP = 1e-6;

type PositionInput = {
  projectId: string;
  status: Status;
  beforeId?: string | null;
  afterId?: string | null;
};

/**
 * Positions are floats so a move only writes one row. When two neighbours get
 * too close the whole column is re-spaced and the midpoint is computed again.
 */
export async function computePosition({
  projectId,
  status,
  beforeId,
  afterId,
}: PositionInput): Promise<number> {
  const neighbourIds = [beforeId, afterId].filter(
    (id): id is string => Boolean(id),
  );

  const neighbours = neighbourIds.length
    ? await prisma.task.findMany({
        where: { id: { in: neighbourIds }, projectId, status },
        select: { id: true, position: true },
      })
    : [];

  const before = neighbours.find((task) => task.id === beforeId);
  const after = neighbours.find((task) => task.id === afterId);

  if (before && after) {
    if (after.position - before.position > MIN_GAP) {
      return (before.position + after.position) / 2;
    }
    await normalizeColumn(projectId, status);
    return computePosition({ projectId, status, beforeId, afterId });
  }

  if (before) return before.position + 1;
  if (after) return after.position - 1;

  const count = await prisma.task.count({ where: { projectId, status } });
  return count + 1;
}

export async function normalizeColumn(projectId: string, status: Status) {
  const tasks = await prisma.task.findMany({
    where: { projectId, status },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  await prisma.$transaction(
    tasks.map((task, index) =>
      prisma.task.update({
        where: { id: task.id },
        data: { position: (index + 1) * 1000 },
      }),
    ),
  );
}
