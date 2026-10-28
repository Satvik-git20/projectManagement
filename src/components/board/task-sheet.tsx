"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Loader2,
  MessageSquare,
  Send,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/http";
import {
  PRIORITIES,
  PRIORITY_META,
  STATUSES,
  STATUS_META,
  type Priority,
  type Role,
  type Status,
} from "@/lib/constants";
import { canManageRole } from "@/lib/permissions-client";
import { cn, formatRelative } from "@/lib/utils";
import type { MemberDTO, TaskDetailDTO } from "@/lib/types";

type Props = {
  taskId: string;
  projectId: string;
  role: Role;
  currentUserId: string;
  members: MemberDTO[];
  onClose: () => void;
};

export function TaskSheet({
  taskId,
  projectId,
  role,
  currentUserId,
  members,
  onClose,
}: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadedVersion, setLoadedVersion] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => apiFetch<TaskDetailDTO>(`/api/tasks/${taskId}`),
  });

  const task = data?.task;
  const comments = data?.comments ?? [];

  // Keep the editable copy in sync with the server without an effect: when the
  // task loads (or changes elsewhere), adjust state during render.
  const version = task ? `${task.id}:${task.updatedAt}` : null;
  if (task && version !== loadedVersion) {
    setLoadedVersion(version);
    setTitle(task.title);
    setDescription(task.description);
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["board", projectId] });
    queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    queryClient.invalidateQueries({ queryKey: ["activity"] });
  };

  const saveDetails = useMutation({
    mutationFn: () =>
      apiFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        json: { title: title.trim(), description },
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Task saved");
    },
    onError: (caught: Error) => toast.error(caught.message),
  });

  const updateField = useMutation({
    mutationFn: (body: {
      status?: Status;
      priority?: Priority;
      assigneeId?: string | null;
      dueDate?: string | null;
    }) => {
      if (body.status) {
        return apiFetch(`/api/tasks/${taskId}/move`, {
          json: { status: body.status, beforeId: null, afterId: null },
        });
      }
      return apiFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        json: body,
      });
    },
    onSuccess: invalidate,
    onError: (caught: Error) => toast.error(caught.message),
  });

  const addComment = useMutation({
    mutationFn: () =>
      apiFetch(`/api/tasks/${taskId}/comments`, { json: { body: comment.trim() } }),
    onSuccess: () => {
      setComment("");
      invalidate();
    },
    onError: (caught: Error) => toast.error(caught.message),
  });

  const deleteComment = useMutation({
    mutationFn: (commentId: string) =>
      apiFetch(`/api/comments/${commentId}`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError: (caught: Error) => toast.error(caught.message),
  });

  const deleteTask = useMutation({
    mutationFn: () => apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Task deleted");
      queryClient.removeQueries({ queryKey: ["task", taskId] });
      onClose();
      invalidate();
    },
    onError: (caught: Error) => toast.error(caught.message),
  });

  const dirty =
    Boolean(task) &&
    (title.trim() !== task?.title || description !== task?.description);

  const canDelete =
    Boolean(task) &&
    (canManageRole(role) ||
      task?.creator.id === currentUserId ||
      task?.assignee?.id === currentUserId);

  return (
    <DialogContent variant="sheet" className="p-0">
      <DialogTitle className="sr-only">Task details</DialogTitle>

      {isLoading ? (
        <div className="space-y-4 p-6">
          <div className="h-6 w-2/3 animate-pulse rounded bg-white/5" />
          <div className="h-24 animate-pulse rounded bg-white/5" />
          <div className="h-32 animate-pulse rounded bg-white/5" />
        </div>
      ) : isError || !task ? (
        <div className="p-8 text-sm text-muted">
          {error instanceof Error ? error.message : "Task not found"}
        </div>
      ) : (
        <div className="flex min-h-full flex-col">
          <div className="border-b border-line-soft px-6 pb-4 pt-6">
            <div className="flex items-center gap-2 pr-10">
              <span
                className={cn("size-1.5 rounded-full", STATUS_META[task.status].dot)}
              />
              <span className="text-[11px] font-semibold uppercase tracking-[0.11em] text-faint">
                {STATUS_META[task.status].label}
              </span>
              <Badge
                variant="outline"
                className="ml-1 border-line/80 font-mono text-[10px]"
              >
                {task.id.slice(0, 6)}
              </Badge>
            </div>

            <textarea
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              rows={2}
              maxLength={140}
              className="mt-2 w-full resize-none bg-transparent text-[19px] font-semibold leading-snug tracking-tight text-ink outline-none placeholder:text-faint"
              placeholder="Task title"
              aria-label="Task title"
            />
          </div>

          <div className="flex-1 space-y-5 px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Meta label="Status" icon={<span className="size-2 rounded-full bg-accent/70" />}>
                <Select
                  value={task.status}
                  onValueChange={(value) =>
                    updateField.mutate({ status: value as Status })
                  }
                >
                  <SelectTrigger aria-label="Task status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_META[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Meta>

              <Meta label="Priority" icon={<span className="size-2 rounded-full bg-amber-400/80" />}>
                <Select
                  value={task.priority}
                  onValueChange={(value) =>
                    updateField.mutate({ priority: value as Priority })
                  }
                >
                  <SelectTrigger aria-label="Task priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {PRIORITY_META[priority].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Meta>

              <Meta label="Assignee" icon={<UserRound className="size-3.5 text-faint" />}>
                <Select
                  value={task.assignee?.id ?? "unassigned"}
                  onValueChange={(value) =>
                    updateField.mutate({
                      assigneeId: value === "unassigned" ? null : value,
                    })
                  }
                >
                  <SelectTrigger aria-label="Task assignee">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.user.id} value={member.user.id}>
                        {member.user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Meta>

              <Meta label="Due date" icon={<CalendarDays className="size-3.5 text-faint" />}>
                <Input
                  type="date"
                  aria-label="Due date"
                  value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                  onChange={(event) =>
                    updateField.mutate({
                      dueDate: event.target.value || null,
                    })
                  }
                  className="h-9"
                />
              </Meta>
            </div>

            <div>
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add context, acceptance criteria, links…"
                rows={5}
                maxLength={4000}
              />
            </div>

            {dirty ? (
              <div className="flex items-center justify-between rounded-lg border border-accent/25 bg-accent/[0.06] px-3 py-2">
                <p className="text-[11.5px] text-accent-soft">Unsaved changes</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setTitle(task.title);
                      setDescription(task.description);
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveDetails.mutate()}
                    disabled={saveDetails.isPending || title.trim().length === 0}
                  >
                    {saveDetails.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="border-t border-line-soft pt-5">
              <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-faint">
                <MessageSquare className="size-3.5" />
                Comments
                {comments.length > 0 ? (
                  <span className="rounded-full bg-white/[0.05] px-1.5 text-[10px] tabular-nums">
                    {comments.length}
                  </span>
                ) : null}
              </h3>

              <ul className="mt-3 space-y-3.5">
                {comments.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-line/80 px-3 py-4 text-center text-[11.5px] text-faint">
                    No comments yet — start the conversation.
                  </li>
                ) : (
                  comments.map((comment) => (
                    <li key={comment.id} className="group flex gap-2.5">
                      <Avatar
                        name={comment.author.name}
                        color={comment.author.avatarColor}
                        size="sm"
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[12.5px] font-medium text-ink">
                            {comment.author.name}
                          </span>
                          <span className="text-[10.5px] text-faint">
                            {formatRelative(comment.createdAt)}
                            {comment.editedAt ? " · edited" : ""}
                          </span>
                          {(comment.author.id === currentUserId ||
                            canManageRole(role)) && (
                            <button
                              onClick={() => deleteComment.mutate(comment.id)}
                              className="ml-auto text-faint opacity-0 transition hover:text-rose-300 focus-visible:opacity-100 group-hover:opacity-100"
                              aria-label="Delete comment"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-muted">
                          {comment.body}
                        </p>
                      </div>
                    </li>
                  ))
                )}
              </ul>

              <div className="mt-4 flex gap-2">
                <Textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      if (comment.trim()) addComment.mutate();
                    }
                  }}
                  placeholder="Write a comment… (⌘↵ to send)"
                  rows={2}
                  maxLength={5000}
                  className="text-[12.5px]"
                />
                <Button
                  size="icon"
                  className="mt-auto"
                  onClick={() => addComment.mutate()}
                  disabled={!comment.trim() || addComment.isPending}
                  aria-label="Send comment"
                >
                  {addComment.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line-soft px-6 py-3">
            <p className="text-[11px] text-faint">
              Created by {task.creator.name} · updated{" "}
              {formatRelative(task.updatedAt)}
            </p>
            {canDelete ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-rose-300">Delete?</span>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => deleteTask.mutate()}
                    disabled={deleteTask.isPending}
                  >
                    {deleteTask.isPending ? "Deleting…" : "Yes, delete"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="danger-ghost"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="size-3.5" />
                  Delete task
                </Button>
              )
            ) : null}
          </div>
        </div>
      )}
    </DialogContent>
  );
}

function Meta({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-faint">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}
