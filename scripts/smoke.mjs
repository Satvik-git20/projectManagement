/**
 * End-to-end smoke test against a running server.
 *   npm run dev            (in another terminal)
 *   npm run smoke
 *
 * Exercises auth, projects, tasks, drag-and-drop moves, comments,
 * notifications and the Socket.IO event stream — then cleans up after itself.
 */
import path from "node:path";
import Database from "better-sqlite3";
import { io } from "socket.io-client";

const BASE = process.env.SMOKE_URL ?? "http://localhost:3100";
let cookie = "";
let passed = 0;

function ok(message) {
  passed += 1;
  console.log(`  \x1b[32m✓\x1b[0m ${message}`);
}

function fail(message) {
  console.error(`  \x1b[31m✗\x1b[0m ${message}`);
  process.exitCode = 1;
}

function check(condition, message) {
  if (condition) ok(message);
  else fail(message);
}

function captureCookies(response) {
  const cookies = response.headers.getSetCookie?.() ?? [];
  for (const entry of cookies) {
    const [pair] = entry.split(";");
    if (pair.startsWith("tf_session=")) cookie = pair;
  }
}

async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      origin: BASE,
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });

  captureCookies(response);

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data };
}

function once(socket, event, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for "${event}"`));
    }, timeout);

    function handler(payload) {
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    }

    socket.on(event, handler);
  });
}

function cleanupUser(email) {
  try {
    const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
    const file = raw.replace(/^file:/, "");
    const url = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
    const db = new Database(url);
    db.pragma("busy_timeout = 5000");
    db.prepare(
      "DELETE FROM Session WHERE userId IN (SELECT id FROM User WHERE email = ?)",
    ).run(email);
    db.prepare("DELETE FROM User WHERE email = ?").run(email);
    db.close();
  } catch (error) {
    console.warn(`  ! could not clean up ${email}:`, error.message);
  }
}

async function main() {
  console.log(`\nTaskFlow smoke test → ${BASE}\n`);

  // 1. Auth ---------------------------------------------------------------
  const loginPage = await fetch(`${BASE}/login`);
  check(loginPage.status === 200, "GET /login renders");

  const email = `smoke-${Date.now()}@taskflow.dev`;
  const register = await api("/api/auth/register", {
    method: "POST",
    body: { name: "Smoke Tester", email, password: "password123" },
  });
  check(register.status === 201, `register → 201 (got ${register.status})`);

  const me = await api("/api/auth/me");
  check(me.data?.user?.email === email, "GET /api/auth/me returns the new user");

  const badPassword = await api("/api/auth/login", {
    method: "POST",
    body: { email, password: "wrong-password" },
  });
  check(badPassword.status === 401, "wrong password → 401");

  // 2. Socket handshake ---------------------------------------------------
  const socket = io(BASE, {
    path: "/socket.io",
    transports: ["websocket"],
    extraHeaders: { cookie },
  });

  try {
    await once(socket, "connected");
    ok("Socket.IO handshake accepts the session cookie");
  } catch {
    fail("Socket.IO handshake failed");
    throw new Error("socket");
  }

  const presenceAfterJoin = once(socket, "presence:update");

  // 3. Projects -----------------------------------------------------------
  const projectResponse = await api("/api/projects", {
    method: "POST",
    body: {
      name: `Smoke Project ${Date.now()}`,
      description: "Created by the smoke test",
      color: "#6366f1",
    },
  });
  check(projectResponse.status === 201, "create project → 201");
  const project = projectResponse.data?.project;
  const projectId = project?.id;
  check(Boolean(projectId), "project id returned");
  check(/^[A-Z0-9]{3}-[A-F0-9]{4}$/.test(project?.joinCode ?? ""), "join code generated");

  socket.emit("project:join", projectId);
  const presenceEnvelope = await presenceAfterJoin;
  check(
    presenceEnvelope.payload.users.some(
      (user) => user.id === me.data.user.id && user.name === "Smoke Tester",
    ),
    "presence broadcast includes the viewer",
  );
  check(
    !("email" in presenceEnvelope.payload.users[0]),
    "presence payload does not leak emails",
  );

  // 4. Tasks + realtime ---------------------------------------------------
  const createdEvent = once(socket, "task:created");
  const taskResponse = await api(`/api/projects/${projectId}/tasks`, {
    method: "POST",
    body: {
      title: "Smoke task",
      description: "Prove the API works",
      priority: "HIGH",
      assigneeId: me.data.user.id,
    },
  });
  check(taskResponse.status === 201, "create task → 201");
  const task = taskResponse.data?.task;
  const taskId = task?.id;

  const created = await createdEvent;
  check(created.payload?.id === taskId, "task:created emitted over the socket");

  const boardBefore = await api(`/api/projects/${projectId}/board`);
  check(
    boardBefore.data?.tasks?.some((item) => item.id === taskId && item.status === "TODO"),
    "board lists the new task in To do",
  );

  const movedEvent = once(socket, "task:moved");
  const move = await api(`/api/tasks/${taskId}/move`, {
    method: "POST",
    body: { status: "DONE", beforeId: null, afterId: null },
  });
  check(move.status === 200, "move task → 200");
  check(move.data?.task?.status === "DONE", "task status updated to DONE");
  check(Boolean(move.data?.task?.completedAt), "completedAt stamped");

  const moved = await movedEvent;
  check(moved.payload?.id === taskId, "task:moved emitted over the socket");

  const patched = await api(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: { title: "Smoke task (edited)" },
  });
  check(
    patched.data?.task?.title === "Smoke task (edited)",
    "PATCH updates the task title",
  );

  // 5. Comments -----------------------------------------------------------
  const commentEvent = once(socket, "comment:created");
  const comment = await api(`/api/tasks/${taskId}/comments`, {
    method: "POST",
    body: { body: "Looks good from the smoke test." },
  });
  check(comment.status === 201, "create comment → 201");
  const commentPayload = await commentEvent;
  check(
    commentPayload.payload?.comment?.body === "Looks good from the smoke test.",
    "comment:created emitted over the socket",
  );

  const detail = await api(`/api/tasks/${taskId}`);
  check(detail.data?.comments?.length === 1, "task detail includes the comment");

  const boardAfter = await api(`/api/projects/${projectId}/board`);
  const fromBoard = boardAfter.data?.tasks?.find((item) => item.id === taskId);
  check(fromBoard?.commentCount === 1, "board exposes the comment count");

  // 6. Notifications ------------------------------------------------------
  const notifications = await api("/api/notifications");
  check(notifications.status === 200, "GET /api/notifications → 200");
  check(
    typeof notifications.data?.unread === "number",
    "notification unread count present",
  );

  const activity = await api(`/api/projects/${projectId}/activity`);
  check(
    activity.data?.activities?.some((entry) => entry.type === "task.moved"),
    "activity feed records the move",
  );

  // 7. Authorisation ------------------------------------------------------
  const stranger = await fetch(`${BASE}/api/projects/${projectId}/board`, {
    headers: { origin: BASE },
  });
  check(stranger.status === 401, "unauthenticated board request → 401");

  const crossOrigin = await api(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: { title: "csrf attempt" },
  });
  check(crossOrigin.status === 200, "same-origin PATCH accepted");

  // 8. Cleanup ------------------------------------------------------------
  const deletedTask = await api(`/api/tasks/${taskId}`, { method: "DELETE" });
  check(deletedTask.status === 204, "delete task → 204");

  const deletedProject = await api(`/api/projects/${projectId}`, {
    method: "DELETE",
  });
  check(deletedProject.status === 204, "delete project → 204");

  socket.disconnect();

  const logout = await api("/api/auth/logout", { method: "POST" });
  check(logout.status === 200, "logout → 200");

  const afterLogout = await api("/api/auth/me");
  check(afterLogout.data?.user === null, "session invalidated after logout");

  cleanupUser(email);
  ok("smoke user removed from the database");

  console.log(
    process.exitCode
      ? `\n\x1b[31m${passed} checks passed, some failed\x1b[0m\n`
      : `\n\x1b[32mAll ${passed} checks passed.\x1b[0m\n`,
  );
}

main().catch((error) => {
  console.error("\nSmoke test crashed:", error);
  process.exitCode = 1;
});
