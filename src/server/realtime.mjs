import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import { Server } from "socket.io";

const DB_URL = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const DB_FILE = path.isAbsolute(DB_URL.replace(/^file:/, ""))
  ? DB_URL.replace(/^file:/, "")
  : path.join(process.cwd(), DB_URL.replace(/^file:/, ""));

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "tf_session";

const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

const sessionQuery = db.prepare(`
  SELECT s.id AS sessionId, s.expiresAt, u.id, u.name, u.email, u.avatarColor
  FROM Session s
  JOIN User u ON u.id = s.userId
  WHERE s.tokenHash = ?
  LIMIT 1
`);

const membershipQuery = db.prepare(`
  SELECT role FROM ProjectMember WHERE projectId = ? AND userId = ? LIMIT 1
`);

const projectsQuery = db.prepare(`
  SELECT projectId FROM ProjectMember WHERE userId = ?
`);

/** @type {Map<string, Map<string, { user: object, sockets: number }>>} */
const presence = new Map();

function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

function authenticate(socket) {
  const cookies = parseCookies(socket.request.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const session = sessionQuery.get(tokenHash);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) return null;

  return {
    id: session.id,
    name: session.name,
    email: session.email,
    avatarColor: session.avatarColor,
  };
}

function broadcastPresence(io, projectId) {
  const room = presence.get(projectId);
  const users = room
    ? [...room.values()].map((entry) => entry.user)
    : [];
  io.to(`project:${projectId}`).emit("presence:update", {
    projectId,
    at: Date.now(),
    payload: { users },
  });
}

function addPresence(io, projectId, user) {
  let room = presence.get(projectId);
  if (!room) {
    room = new Map();
    presence.set(projectId, room);
  }
  const existing = room.get(user.id);
  room.set(user.id, {
    user: {
      id: user.id,
      name: user.name,
      avatarColor: user.avatarColor,
    },
    sockets: (existing?.sockets ?? 0) + 1,
  });
  broadcastPresence(io, projectId);
}

function removePresence(io, projectId, userId) {
  const room = presence.get(projectId);
  if (!room) return;
  const existing = room.get(userId);
  if (!existing) return;

  if (existing.sockets <= 1) room.delete(userId);
  else room.set(userId, { ...existing, sockets: existing.sockets - 1 });

  if (room.size === 0) presence.delete(projectId);
  broadcastPresence(io, projectId);
}

export function attachRealtime(httpServer) {
  const io = new Server(httpServer, {
    path: "/socket.io",
    serveClient: false,
    pingInterval: 20000,
    pingTimeout: 25000,
    maxHttpBufferSize: 1e5,
  });

  io.use((socket, next) => {
    const user = authenticate(socket);
    if (!user) return next(new Error("unauthorized"));
    socket.data.user = user;
    socket.data.projects = new Set();
    next();
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    socket.join(`user:${user.id}`);

    // Members receive board events for every project they belong to.
    for (const row of projectsQuery.all(user.id)) {
      socket.join(`project:${row.projectId}`);
    }

    socket.emit("connected", { user, at: Date.now() });

    socket.on("project:join", (projectId, ack) => {
      if (typeof projectId !== "string") return;
      const membership = membershipQuery.get(projectId, user.id);
      if (!membership) {
        if (typeof ack === "function") ack({ ok: false });
        return;
      }
      socket.join(`project:${projectId}`);
      socket.data.projects.add(projectId);
      addPresence(io, projectId, user);
      if (typeof ack === "function") ack({ ok: true, role: membership.role });
    });

    socket.on("project:leave", (projectId) => {
      if (typeof projectId !== "string") return;
      socket.leave(`project:${projectId}`);
      socket.data.projects.delete(projectId);
      removePresence(io, projectId, user.id);
    });

    socket.on("disconnect", () => {
      for (const projectId of socket.data.projects) {
        removePresence(io, projectId, user.id);
      }
      socket.data.projects.clear();
    });
  });

  globalThis.__taskflowIo = io;
  return io;
}
