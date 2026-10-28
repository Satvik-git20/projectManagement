import type { Server } from "socket.io";

declare global {
  var __taskflowIo: Server | undefined;
}

export type RealtimeEvent =
  | "task:created"
  | "task:updated"
  | "task:moved"
  | "task:deleted"
  | "comment:created"
  | "comment:updated"
  | "comment:deleted"
  | "project:updated"
  | "project:deleted"
  | "member:added"
  | "member:updated"
  | "member:removed"
  | "activity:new"
  | "notification:new";

export function getIO() {
  return globalThis.__taskflowIo;
}

export function emitToProject(
  projectId: string,
  event: RealtimeEvent,
  payload: unknown,
) {
  getIO()
    ?.to(`project:${projectId}`)
    .emit(event, { projectId, at: Date.now(), payload });
}

export function emitToUser(
  userId: string,
  event: RealtimeEvent,
  payload: unknown,
) {
  getIO()
    ?.to(`user:${userId}`)
    .emit(event, { at: Date.now(), payload });
}
