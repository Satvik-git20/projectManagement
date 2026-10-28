"use client";

import { useQuery } from "@tanstack/react-query";
import {
  MessageSquare,
  MoveRight,
  PlusCircle,
  Settings,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/http";
import { formatRelative } from "@/lib/utils";
import type { ActivityDTO } from "@/lib/types";

const ICONS: Record<string, React.ReactNode> = {
  "project.created": <PlusCircle className="size-3.5" />,
  "project.updated": <Settings className="size-3.5" />,
  "task.created": <PlusCircle className="size-3.5" />,
  "task.moved": <MoveRight className="size-3.5" />,
  "task.updated": <Settings className="size-3.5" />,
  "task.deleted": <Trash2 className="size-3.5" />,
  "comment.created": <MessageSquare className="size-3.5" />,
  "comment.deleted": <Trash2 className="size-3.5" />,
  "member.added": <UserPlus className="size-3.5" />,
};

export function ActivityDrawer({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["activity", projectId],
    queryFn: () =>
      apiFetch<{ activities: ActivityDTO[] }>(
        `/api/projects/${projectId}/activity`,
      ),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="sheet" className="p-0">
      <div className="border-b border-line-soft px-6 pb-4 pt-6">
        <DialogTitle>Project activity</DialogTitle>
        <p className="mt-1 text-sm text-muted">
          Everything that changed, newest first.
        </p>
      </div>

      <div className="px-6 py-5">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="size-7 rounded-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : !data || data.activities.length === 0 ? (
          <p className="py-10 text-center text-sm text-faint">
            No activity yet. Move a card and it will show up here.
          </p>
        ) : (
          <ol className="relative space-y-4 before:absolute before:inset-y-2 before:left-[13px] before:w-px before:bg-line-soft">
            {data.activities.map((activity) => (
              <li key={activity.id} className="relative flex gap-3 pl-0">
                <Avatar
                  name={activity.actor.name}
                  color={activity.actor.avatarColor}
                  size="sm"
                  className="relative z-10 mt-0.5 ring-2 ring-surface"
                />
                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-[12.5px] leading-relaxed text-muted">
                    <span className="font-medium text-ink">
                      {activity.actor.name}
                    </span>{" "}
                    {activity.message}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-faint">
                    <span className="grid size-4 place-items-center rounded bg-white/[0.05]">
                      {ICONS[activity.type] ?? (
                        <PlusCircle className="size-3" />
                      )}
                    </span>
                    {formatRelative(activity.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
      </DialogContent>
    </Dialog>
  );
}
