"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { History, Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import { BoardColumn } from "@/components/board/board-column";
import { NewTaskDialog } from "@/components/board/new-task-dialog";
import { TaskCardBody } from "@/components/board/task-card";
import { TaskSheet } from "@/components/board/task-sheet";
import { MembersDialog } from "@/components/board/members-dialog";
import { ActivityDrawer } from "@/components/board/activity-drawer";
import { AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRealtime } from "@/components/realtime/socket-provider";
import { apiFetch } from "@/lib/http";
import { applyMove, byPosition, completionPercent, tasksInColumn } from "@/lib/board-utils";
import {
  PRIORITIES,
  PRIORITY_META,
  STATUSES,
  type Status,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { BoardDTO } from "@/lib/types";

export function BoardView({
  initialBoard,
  initialTaskId,
}: {
  initialBoard: BoardDTO;
  initialTaskId?: string;
}) {
  const projectId = initialBoard.project.id;
  const queryClient = useQueryClient();
  const { joinProject, leaveProject, presence, connected, status } = useRealtime();

  const { data: board } = useQuery<BoardDTO>({
    queryKey: ["board", projectId],
    queryFn: () => apiFetch<BoardDTO>(`/api/projects/${projectId}/board`),
    initialData: initialBoard,
  });

  useEffect(() => {
    joinProject(projectId);
    return () => leaveProject(projectId);
  }, [projectId, joinProject, leaveProject]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(
    initialTaskId ?? null,
  );
  const [composerStatus, setComposerStatus] = useState<Status | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const moveTask = useMutation({
    mutationFn: (input: {
      taskId: string;
      status: Status;
      beforeId: string | null;
      afterId: string | null;
    }) =>
      apiFetch(`/api/tasks/${input.taskId}/move`, {
        json: {
          status: input.status,
          beforeId: input.beforeId,
          afterId: input.afterId,
        },
      }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["board", projectId] });
      const previous = queryClient.getQueryData<BoardDTO>(["board", projectId]);
      if (previous) {
        queryClient.setQueryData<BoardDTO>(["board", projectId], {
          ...previous,
          tasks: applyMove(
            previous.tasks,
            input.taskId,
            input.status,
            input.beforeId,
            input.afterId,
          ),
        });
      }
      return { previous };
    },
    onError: (caught: Error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["board", projectId], context.previous);
      }
      toast.error(caught.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["board", projectId] });
      queryClient.invalidateQueries({ queryKey: ["activity", projectId] });
    },
  });

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return board.tasks.filter((task) => {
      if (
        query &&
        !task.title.toLowerCase().includes(query) &&
        !task.description.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (assigneeFilter === "unassigned" && task.assignee) return false;
      if (
        assigneeFilter !== "all" &&
        assigneeFilter !== "unassigned" &&
        task.assignee?.id !== assigneeFilter
      ) {
        return false;
      }
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }
      return true;
    });
  }, [board.tasks, search, assigneeFilter, priorityFilter]);

  const activeTask = activeId
    ? board.tasks.find((task) => task.id === activeId)
    : null;

  const viewers = presence[projectId] ?? [];
  const hasFilters =
    search.trim().length > 0 ||
    assigneeFilter !== "all" ||
    priorityFilter !== "all";

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const task = board.tasks.find((item) => item.id === active.id);
    if (!task) return;

    const overId = String(over.id);
    const targetStatus: Status = overId.startsWith("column:")
      ? (overId.slice(7) as Status)
      : (board.tasks.find((item) => item.id === overId)?.status ?? task.status);

    const destination = board.tasks
      .filter((item) => item.status === targetStatus)
      .sort(byPosition);

    let newIndex = destination.length;
    if (!overId.startsWith("column:")) {
      const overIndex = destination.findIndex((item) => item.id === overId);
      if (overIndex !== -1) newIndex = overIndex;
    }

    const without = destination.filter((item) => item.id !== task.id);
    const insertAt = Math.min(newIndex, without.length);
    const before = without[insertAt - 1] ?? null;
    const after = without[insertAt] ?? null;

    if (targetStatus === task.status) {
      const original = destination.findIndex((item) => item.id === task.id);
      const originalBefore = destination[original - 1]?.id ?? null;
      const originalAfter = destination[original + 1]?.id ?? null;
      if (
        originalBefore === (before?.id ?? null) &&
        originalAfter === (after?.id ?? null)
      ) {
        return;
      }
    }

    moveTask.mutate({
      taskId: task.id,
      status: targetStatus,
      beforeId: before?.id ?? null,
      afterId: after?.id ?? null,
    });
  }

  const progress = completionPercent(board.tasks);
  const doneCount = board.tasks.filter((task) => task.status === "DONE").length;

  return (
    <>
      <div className="border-b border-line-soft px-4 pb-4 pt-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className="size-2.5 shrink-0 rounded-full ring-4 ring-inset ring-white/5"
                style={{ backgroundColor: board.project.color }}
              />
              <h1 className="truncate text-[1.35rem] font-semibold tracking-tight">
                {board.project.name}
              </h1>
              <Badge variant={board.role === "MEMBER" ? "neutral" : "accent"}>
                {board.role.toLowerCase()}
              </Badge>
              <Badge variant="outline" className="hidden font-mono sm:inline-flex">
                {board.project.joinCode}
              </Badge>
            </div>

            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">
              {board.project.description || "No description yet."}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] text-faint">
              <span className="flex items-center gap-2">
                <AvatarStack
                  users={board.members.map((member) => member.user)}
                  max={5}
                />
                {board.members.length} members
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    connected ? "bg-emerald-400" : "bg-amber-400",
                  )}
                />
                {viewers.length > 0
                  ? `${viewers.length} viewing now`
                  : connected
                    ? "Live updates on"
                    : status === "connecting"
                      ? "Connecting…"
                      : "Reconnecting…"}
              </span>
              <span>
                {doneCount} of {board.tasks.length} done · {progress}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMembersOpen(true)}
            >
              <Users className="size-3.5" />
              Members
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActivityOpen(true)}
            >
              <History className="size-3.5" />
              Activity
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter tasks…"
              className="h-8 w-56 pl-8 text-[12.5px]"
              aria-label="Filter tasks"
            />
          </div>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="h-8 w-[9.5rem] text-[12.5px]" aria-label="Filter by assignee">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {board.members.map((member) => (
                <SelectItem key={member.user.id} value={member.user.id}>
                  {member.user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 w-[8.5rem] text-[12.5px]" aria-label="Filter by priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any priority</SelectItem>
              {PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {PRIORITY_META[priority].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setAssigneeFilter("all");
                setPriorityFilter("all");
              }}
            >
              <X className="size-3.5" />
              Clear
            </Button>
          ) : null}

          <span className="ml-auto text-[11px] tabular-nums text-faint">
            {filteredTasks.length} of {board.tasks.length} tasks
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto px-4 py-4 sm:px-6">
        <DndContext
          id="taskflow-board"
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="flex items-start gap-3 pb-4 lg:grid lg:grid-cols-4 lg:items-stretch">
            {STATUSES.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                tasks={tasksInColumn(filteredTasks, status)}
                onAdd={(next) => setComposerStatus(next)}
                onOpen={setOpenTaskId}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? <TaskCardBody task={activeTask} dragging /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      <Dialog
        open={Boolean(openTaskId)}
        onOpenChange={(open) => {
          if (!open) setOpenTaskId(null);
        }}
      >
        {openTaskId ? (
          <TaskSheet
            taskId={openTaskId}
            projectId={projectId}
            role={board.role}
            currentUserId={board.currentUserId}
            members={board.members}
            onClose={() => setOpenTaskId(null)}
          />
        ) : null}
      </Dialog>

      <NewTaskDialog
        projectId={projectId}
        status={composerStatus ?? "TODO"}
        members={board.members}
        open={composerStatus !== null}
        onOpenChange={(open) => {
          if (!open) setComposerStatus(null);
        }}
        onCreated={(taskId) => setOpenTaskId(taskId)}
      />

      <MembersDialog
        project={board.project}
        members={board.members}
        role={board.role}
        currentUserId={board.currentUserId}
        open={membersOpen}
        onOpenChange={setMembersOpen}
      />

      <ActivityDrawer
        projectId={projectId}
        open={activityOpen}
        onOpenChange={setActivityOpen}
      />
    </>
  );
}
