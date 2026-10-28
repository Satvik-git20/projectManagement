"use client";

import { useRef } from "react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { ArrowUpRight, CalendarDays, MessageSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { PRIORITY_META, STATUS_META } from "@/lib/constants";
import { cn, formatDueDate, isOverdue } from "@/lib/utils";
import type { TaskDTO } from "@/lib/types";

export function TaskCardBody({
  task,
  dragging = false,
  onOpen,
}: {
  task: TaskDTO;
  dragging?: boolean;
  onOpen?: (taskId: string) => void;
}) {
  const priority = PRIORITY_META[task.priority];
  const due = formatDueDate(task.dueDate);
  const overdue = task.status !== "DONE" && isOverdue(task.dueDate);

  return (
    <div
      className={cn(
        "rounded-lg border border-line-soft bg-raised/80 p-3 transition",
        !dragging && "group-hover:border-[#333a4b] group-hover:bg-[#171b24]",
        dragging && "rotate-2 border-accent/40 bg-elevated shadow-2xl shadow-black/60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-ink">
          {task.title}
        </p>
        <span
          className={cn(
            "mt-0.5 shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide ring-1 ring-inset",
            priority.className,
          )}
        >
          {priority.label}
        </span>
      </div>

      {task.description ? (
        <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-faint">
          {task.description}
        </p>
      ) : null}

      <div className="mt-2.5 flex items-center gap-2.5 text-[10.5px] text-faint">
        {due ? (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              overdue && "text-rose-300",
            )}
          >
            <CalendarDays className="size-3" />
            {due}
          </span>
        ) : null}
        {task.commentCount > 0 ? (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3" />
            {task.commentCount}
          </span>
        ) : null}
        <span className="sr-only">
          {STATUS_META[task.status].label}, {priority.label} priority
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          {onOpen ? (
            <button
              type="button"
              data-no-open
              onClick={(event) => {
                event.stopPropagation();
                onOpen(task.id);
              }}
              className="grid size-5 place-items-center rounded-md text-faint opacity-0 transition hover:bg-white/[0.07] hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
              aria-label={`Open task: ${task.title}`}
            >
              <ArrowUpRight className="size-3" />
            </button>
          ) : null}
          {task.assignee ? (
            <Avatar
              name={task.assignee.name}
              color={task.assignee.avatarColor}
              size="xs"
            />
          ) : (
            <span
              className="grid size-5 place-items-center rounded-full border border-dashed border-line text-[9px] text-faint"
              title="Unassigned"
            >
              ?
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export function SortableTaskCard({
  task,
  onOpen,
}: {
  task: TaskDTO;
  onOpen: (taskId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { status: task.status } });
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
      className="group relative cursor-grab touch-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent/60 active:cursor-grabbing"
      {...attributes}
      {...listeners}
      onPointerDown={(event) => {
        pointerStart.current = { x: event.clientX, y: event.clientY };
        listeners?.onPointerDown?.(event as never);
      }}
      onClick={(event) => {
        if (isDragging) return;
        const start = pointerStart.current;
        if (
          start &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6
        ) {
          return;
        }
        const target = event.target as HTMLElement;
        if (target.closest("[data-no-open]")) return;
        onOpen(task.id);
      }}
    >
      <TaskCardBody task={task} onOpen={onOpen} />
    </div>
  );
}
