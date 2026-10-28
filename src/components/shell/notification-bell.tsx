"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/http";
import { cn, formatRelative } from "@/lib/utils";
import type { NotificationDTO } from "@/lib/types";

type Payload = { notifications: NotificationDTO[]; unread: number };

export function NotificationBell({ initialUnread = 0 }: { initialUnread?: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<Payload>("/api/notifications"),
    refetchInterval: 60_000,
  });

  const unread = data?.unread ?? initialUnread;

  const markAll = useMutation({
    mutationFn: () =>
      apiFetch("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOne = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  function openNotification(notification: NotificationDTO) {
    if (!notification.readAt) markOne.mutate(notification.id);
    if (notification.projectId) {
      const query = notification.taskId ? `?task=${notification.taskId}` : "";
      router.push(`/projects/${notification.projectId}${query}`);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative grid size-9 place-items-center rounded-lg border border-transparent text-muted transition hover:border-line hover:bg-white/[0.04] hover:text-ink"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        >
          <Bell className="size-[17px]" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-4 text-white ring-2 ring-canvas">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b border-line-soft px-3 py-2.5">
          <div>
            <p className="text-[13px] font-semibold text-ink">Notifications</p>
            <p className="text-[11px] text-faint">
              {unread > 0 ? `${unread} unread` : "You're all caught up"}
            </p>
          </div>
          {unread > 0 ? (
            <button
              onClick={() => markAll.mutate()}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-accent-soft transition hover:bg-white/[0.05]"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          ) : null}
        </div>

        <div className="max-h-[22rem] overflow-y-auto p-1">
          {!data || data.notifications.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <Bell className="mx-auto size-5 text-faint" />
              <p className="mt-2 text-xs text-faint">
                Assignments and comments will show up here.
              </p>
            </div>
          ) : (
            data.notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => openNotification(notification)}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/[0.05]",
                  !notification.readAt && "bg-accent/[0.055]",
                )}
              >
                {notification.actor ? (
                  <Avatar
                    name={notification.actor.name}
                    color={notification.actor.avatarColor}
                    size="sm"
                    className="mt-0.5"
                  />
                ) : (
                  <span className="mt-0.5 grid size-6 place-items-center rounded-full bg-white/5 text-faint">
                    <Bell className="size-3" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium text-ink">
                    {notification.title}
                  </span>
                  {notification.body ? (
                    <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-muted">
                      {notification.body}
                    </span>
                  ) : null}
                  <span className="mt-1 block text-[10.5px] text-faint">
                    {formatRelative(notification.createdAt)}
                  </span>
                </span>
                {!notification.readAt ? (
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                ) : null}
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
