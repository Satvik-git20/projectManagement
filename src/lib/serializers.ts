import "server-only";
import type { Priority, Role, Status } from "./constants";
import type {
  ActivityDTO,
  BoardDTO,
  CommentDTO,
  MemberDTO,
  NotificationDTO,
  ProjectSummaryDTO,
  PublicUser,
  TaskDTO,
} from "./types";

type UserLike = {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
};

type DateLike = Date | string;

function iso(value: DateLike | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toPublicUser(user: UserLike): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarColor: user.avatarColor,
  };
}

type TaskLike = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  position: number;
  dueDate: DateLike | null;
  completedAt: DateLike | null;
  createdAt: DateLike;
  updatedAt: DateLike;
  assignee: UserLike | null;
  creator: UserLike;
  _count?: { comments: number };
};

export function toTaskDTO(task: TaskLike): TaskDTO {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status as Status,
    priority: task.priority as Priority,
    position: task.position,
    dueDate: iso(task.dueDate),
    completedAt: iso(task.completedAt),
    createdAt: iso(task.createdAt) as string,
    updatedAt: iso(task.updatedAt) as string,
    assignee: task.assignee ? toPublicUser(task.assignee) : null,
    creator: toPublicUser(task.creator),
    commentCount: task._count?.comments ?? 0,
  };
}

type CommentLike = {
  id: string;
  taskId: string;
  body: string;
  createdAt: DateLike;
  updatedAt: DateLike;
  editedAt: DateLike | null;
  author: UserLike;
};

export function toCommentDTO(comment: CommentLike): CommentDTO {
  return {
    id: comment.id,
    taskId: comment.taskId,
    body: comment.body,
    createdAt: iso(comment.createdAt) as string,
    updatedAt: iso(comment.updatedAt) as string,
    editedAt: iso(comment.editedAt),
    author: toPublicUser(comment.author),
  };
}

type ActivityLike = {
  id: string;
  type: string;
  message: string;
  createdAt: DateLike;
  taskId: string | null;
  actor: UserLike;
};

export function toActivityDTO(activity: ActivityLike): ActivityDTO {
  return {
    id: activity.id,
    type: activity.type,
    message: activity.message,
    createdAt: iso(activity.createdAt) as string,
    taskId: activity.taskId,
    actor: toPublicUser(activity.actor),
  };
}

type NotificationLike = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: DateLike | null;
  createdAt: DateLike;
  projectId: string | null;
  taskId: string | null;
  actor: UserLike | null;
};

export function toNotificationDTO(
  notification: NotificationLike,
): NotificationDTO {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    readAt: iso(notification.readAt),
    createdAt: iso(notification.createdAt) as string,
    projectId: notification.projectId,
    taskId: notification.taskId,
    actor: notification.actor ? toPublicUser(notification.actor) : null,
  };
}

type MemberLike = {
  id: string;
  role: string;
  joinedAt: DateLike;
  user: UserLike;
};

export function toMemberDTO(member: MemberLike): MemberDTO {
  return {
    id: member.id,
    role: member.role as Role,
    joinedAt: iso(member.joinedAt) as string,
    user: toPublicUser(member.user),
  };
}

type BoardProjectLike = {
  id: string;
  name: string;
  description: string;
  color: string;
  joinCode: string;
  ownerId: string;
  createdAt: DateLike;
  updatedAt: DateLike;
  members: MemberLike[];
  tasks: TaskLike[];
};

export function toBoardDTO(
  project: BoardProjectLike,
  role: Role,
  currentUserId: string,
): BoardDTO {
  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      color: project.color,
      joinCode: project.joinCode,
      ownerId: project.ownerId,
      createdAt: iso(project.createdAt) as string,
      updatedAt: iso(project.updatedAt) as string,
    },
    role,
    currentUserId,
    members: project.members.map(toMemberDTO),
    tasks: project.tasks.map(toTaskDTO),
  };
}

type ProjectSummaryLike = {
  id: string;
  name: string;
  description: string;
  color: string;
  joinCode: string;
  ownerId: string;
  createdAt: DateLike;
  updatedAt: DateLike;
  members: { role: string; user: UserLike }[];
  _count: { tasks: number };
  tasks: { id: string }[];
};

export function toProjectSummaryDTO(
  project: ProjectSummaryLike,
  currentUserId: string,
): ProjectSummaryDTO {
  const me = project.members.find((m) => m.user.id === currentUserId);
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    color: project.color,
    joinCode: project.joinCode,
    ownerId: project.ownerId,
    role: (me?.role ?? "MEMBER") as Role,
    createdAt: iso(project.createdAt) as string,
    updatedAt: iso(project.updatedAt) as string,
    memberCount: project.members.length,
    taskCount: project._count.tasks,
    doneCount: project.tasks.length,
    members: project.members.map((m) => toPublicUser(m.user)),
  };
}
