# TaskFlow

A collaborative project management app — group projects, drag-and-drop task
boards, assignable cards, threaded comments, in-app notifications, an activity
log and real-time updates over Socket.IO.

Built as a single Next.js 16 app with a custom Node server so the web app and
the WebSocket server share one origin (cookies work for both).

```
Next.js 16 (App Router, RSC)  ·  React 19  ·  TypeScript
Prisma 7 + SQLite (better-sqlite3)  ·  Socket.IO 4
TanStack Query  ·  dnd-kit  ·  Tailwind CSS v4  ·  Radix primitives
```

---

## Quick start

```bash
npm install          # also runs `prisma generate`
cp .env.example .env # Windows: copy .env.example .env
npm run db:reset     # create the SQLite schema and seed demo data
npm run dev          # http://localhost:3000
```

Demo account (seeded):

```
maya@taskflow.dev / password123
```

Other seeded teammates: `diego@…`, `priya@…`, `jonas@taskflow.dev` — same
password. The login screen has an **Explore the demo workspace** button.

> **Port note:** the dev server reads `PORT` from `.env`. This repo ships with
> `PORT=3100` because port 3000 was occupied during development — change it in
> `.env` if you prefer 3000.

### Scripts

| Script              | What it does                                            |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Next + Socket.IO via `server.mjs` (Turbopack)           |
| `npm run build`     | Production build                                        |
| `npm start`         | Run the built app on the custom server                  |
| `npm run lint`      | ESLint (Next config)                                    |
| `npm run typecheck` | `tsc --noEmit`                                          |
| `npm test`          | Vitest unit tests (33)                                  |
| `npm run smoke`     | End-to-end API + socket test against a running server   |
| `npm run db:migrate`| `prisma migrate dev`                                    |
| `npm run db:seed`   | Re-seed demo data                                       |
| `npm run db:reset`  | Drop, re-migrate and re-seed                            |
| `npm run db:studio` | Prisma Studio                                           |

The smoke test cleans up the user/project it creates. Run it while `npm run
dev` is up:

```bash
npm run smoke     # 32 assertions: auth, CRUD, moves, comments, sockets, authz
```

---

## Features

**Core**

- Email/password accounts with bcrypt hashing and database-backed sessions.
- Group projects with a unique join code and email invitations.
- Four fixed columns (Backlog, To do, In progress, Done) with drag-and-drop
  reordering and cross-column moves.
- Task cards: title, description, priority, assignee, due date, comment count.
- Task sheet: inline editing, status/priority/assignee/due-date changes,
  threaded comments.
- Role-based access: `OWNER` → `ADMIN` → `MEMBER`.

**Bonus**

- **Real-time boards** — Socket.IO broadcasts into `project:<id>` rooms;
  TanStack Query caches are invalidated on every event.
- **Presence** — “N viewing now” shown to everyone on a board.
- **In-app notifications** — assignment, comments, moves, invitations, with
  unread badge, mark-one/mark-all-read and deep links.
- **Activity log** — append-only per-project feed in a side drawer.

---

## Architecture

```
server.mjs                     custom HTTP server: Next handler + Socket.IO
src/server/realtime.mjs        socket auth, project rooms, presence tracking
src/proxy.ts                   optimistic cookie guard (redirects only)
src/app/(auth)/…               login / register (split-screen marketing panel)
src/app/(app)/…                authenticated shell: sidebar, topbar, projects, board
src/app/api/…                  REST route handlers
src/lib/…                      db, auth, permissions, validation, realtime bridge
src/components/…               board, dialogs/sheets, shell, UI primitives
prisma/schema.prisma           data model + migration in prisma/migrations
src/generated/prisma           generated client (gitignored, postinstall)
```

**One process.** `server.mjs` boots Next in dev or production mode, attaches
Socket.IO to the same HTTP server, and the client connects to the same origin
with `withCredentials: true`. No second port, no CORS, no JWT in localStorage.

**Auth.** Login creates a random 32-byte token; only its SHA-256 hash is stored
(`Session.tokenHash`). The token lives in an httpOnly, SameSite=Lax cookie with
a 30-day sliding expiry (writes at most once an hour). Socket.IO authenticates
by hashing the same cookie and reading the session row through better-sqlite3
directly — the socket server never needs Prisma at handshake time.

**Ordering.** `Task.position` is a float. A move writes one row using the
midpoint of its new neighbours; if the gap closes below `1e-6`, the column is
renormalised in a transaction. Drag-and-drop applies an optimistic update in
the client and rolls back on error.

**Security.** Zod validation on every write, parameterised Prisma queries,
same-origin checks on state-changing requests, bcrypt cost 12, login/register
rate limiting, project ids return 404 (not 403) to non-members, and comments
can only be edited by their author.

---

## Data model

`User` · `Session` · `Project` · `ProjectMember` (`role`) · `Task`
(`status`, `priority`, `position`, `assignee`, `creator`, `dueDate`) ·
`Comment` · `Notification` · `Activity`.

Cascades: deleting a project removes its members, tasks, comments, activity and
notifications; deleting a task removes its comments and activity.

---

## API

All routes are under `/api`. JSON in/out; errors are `{ "error": "…" }`.

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/auth/register` | Create account + session |
| `POST` | `/auth/login` | Sign in |
| `POST` | `/auth/logout` | Destroy current session |
| `GET`  | `/auth/me` | Current user or `null` |
| `GET`  | `/projects` | Projects for the current user |
| `POST` | `/projects` | Create project (caller becomes owner) |
| `GET`  | `/projects/:id` | Project settings + members + role |
| `PATCH`| `/projects/:id` | Update name/description/color (admin+) |
| `DELETE`| `/projects/:id` | Delete project (owner) |
| `POST` | `/projects/join` | Join by code |
| `GET`  | `/projects/:id/board` | Board payload (project, role, members, tasks) |
| `GET`  | `/projects/:id/members` | List members |
| `POST` | `/projects/:id/members` | Invite by email (admin+) |
| `PATCH`| `/projects/:id/members/:userId` | Change role (admin+) |
| `DELETE`| `/projects/:id/members/:userId` | Remove / leave |
| `POST` | `/projects/:id/tasks` | Create task |
| `GET`  | `/projects/:id/activity` | Activity feed (`?take=`) |
| `GET`  | `/tasks/:id` | Task + comments |
| `PATCH`| `/tasks/:id` | Update task fields |
| `DELETE`| `/tasks/:id` | Delete (creator, assignee, admin+) |
| `POST` | `/tasks/:id/move` | Move to status with `beforeId` / `afterId` |
| `GET`  | `/tasks/:id/comments` | List comments |
| `POST` | `/tasks/:id/comments` | Add comment |
| `PATCH`| `/comments/:id` | Edit own comment |
| `DELETE`| `/comments/:id` | Delete own comment (admin+ any) |
| `GET`  | `/notifications` | Latest 30 + unread count |
| `POST` | `/notifications/:id/read` | Mark one read |
| `POST` | `/notifications/read-all` | Mark all read |

### Socket events

Client → server: `project:join`, `project:leave`.

Server → client: `connected`, `presence:update`, `task:created`,
`task:updated`, `task:moved`, `task:deleted`, `comment:created`,
`comment:updated`, `comment:deleted`, `member:added`, `member:updated`,
`member:removed`, `project:updated`, `project:deleted`, `activity:new`,
`notification:new`.

Every payload is wrapped as `{ projectId?, at, payload }`.

---

## Testing

- `npm test` — pure unit tests for ordering/moves, validation schemas,
  permission helpers and formatting.
- `npm run smoke` — real HTTP + WebSocket run against the dev server; verifies
  auth, project/task/comment lifecycles, socket broadcasts, presence privacy,
  authorization and cleanup.

---

## Notes & trade-offs

- SQLite keeps setup to zero services; Prisma makes a Postgres swap a provider
  change plus a migration. The Socket.IO auth bridge is the only place that
  speaks SQL directly.
- Presence is in-memory, so a multi-instance deployment would need a Redis
  adapter for Socket.IO.
- The join code is a lightweight sharing mechanism, not a secret; rotate it by
  recreating the project if needed.
