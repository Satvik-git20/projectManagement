import { ROLE_RANK, type Role } from "./constants";

export function canManageRole(role: Role) {
  return ROLE_RANK[role] >= ROLE_RANK.ADMIN;
}

export function canDeleteTaskAs(
  role: Role,
  task: { creatorId: string; assigneeId: string | null },
  userId: string,
) {
  return (
    canManageRole(role) ||
    task.creatorId === userId ||
    task.assigneeId === userId
  );
}
