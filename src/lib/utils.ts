import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function colorFor(seed: string) {
  const colors = [
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
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return colors[hash % colors.length];
}

// A fixed locale keeps server and client output identical (avoids hydration
// mismatches when the browser locale differs from the server's).
const DATE_LOCALE = "en-US";

export function formatRelative(input: string | Date) {
  const date = typeof input === "string" ? new Date(input) : input;
  const diff = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;

  return date.toLocaleDateString(DATE_LOCALE, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

export function formatDueDate(input: string | Date | null | undefined) {
  if (!input) return null;
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toLocaleDateString(DATE_LOCALE, {
    month: "short",
    day: "numeric",
  });
}

export function isOverdue(input: string | Date | null | undefined) {
  if (!input) return false;
  const date = typeof input === "string" ? new Date(input) : input;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

export function parseError(error: unknown, fallback = "Something went wrong") {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
