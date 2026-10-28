export const STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_META: Record<
  Status,
  { label: string; accent: string; dot: string }
> = {
  BACKLOG: { label: "Backlog", accent: "#94a3b8", dot: "bg-slate-400" },
  TODO: { label: "To do", accent: "#60a5fa", dot: "bg-blue-400" },
  IN_PROGRESS: {
    label: "In progress",
    accent: "#fbbf24",
    dot: "bg-amber-400",
  },
  DONE: { label: "Done", accent: "#34d399", dot: "bg-emerald-400" },
};

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_META: Record<
  Priority,
  { label: string; className: string; dot: string }
> = {
  LOW: {
    label: "Low",
    className: "bg-slate-500/10 text-slate-300 ring-slate-500/25",
    dot: "bg-slate-400",
  },
  MEDIUM: {
    label: "Medium",
    className: "bg-sky-500/10 text-sky-300 ring-sky-500/25",
    dot: "bg-sky-400",
  },
  HIGH: {
    label: "High",
    className: "bg-amber-500/10 text-amber-300 ring-amber-500/25",
    dot: "bg-amber-400",
  },
  URGENT: {
    label: "Urgent",
    className: "bg-rose-500/10 text-rose-300 ring-rose-500/25",
    dot: "bg-rose-400",
  },
};

export const ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_RANK: Record<Role, number> = {
  OWNER: 3,
  ADMIN: 2,
  MEMBER: 1,
};

export const PROJECT_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
] as const;

export const AVATAR_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
] as const;

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || "tf_session";
export const SESSION_TTL_DAYS = 30;
