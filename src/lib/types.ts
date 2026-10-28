import type { Priority, Role, Status } from "./constants";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
};

export type MemberDTO = {
  id: string;
  role: Role;
  joinedAt: string;
  user: PublicUser;
};

export type ProjectSummaryDTO = {
  id: string;
  name: string;
  description: string;
  color: string;
  joinCode: string;
  ownerId: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  taskCount: number;
  doneCount: number;
  members: PublicUser[];
};

export type TaskDTO = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  position: number;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: PublicUser | null;
  creator: PublicUser;
  commentCount: number;
};

export type BoardDTO = {
  project: {
    id: string;
    name: string;
    description: string;
    color: string;
    joinCode: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
  };
  role: Role;
  currentUserId: string;
  members: MemberDTO[];
  tasks: TaskDTO[];
};

export type CommentDTO = {
  id: string;
  taskId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  author: PublicUser;
};

export type ActivityDTO = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  actor: PublicUser;
  taskId: string | null;
};

export type NotificationDTO = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  projectId: string | null;
  taskId: string | null;
  actor: PublicUser | null;
};

export type TaskDetailDTO = {
  task: TaskDTO;
  comments: CommentDTO[];
};

export type SocketEnvelope<T = unknown> = {
  projectId?: string;
  at: number;
  payload: T;
};
