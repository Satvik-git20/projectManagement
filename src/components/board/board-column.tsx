"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { SortableTaskCard } from "@/components/board/task-card";
import { STATUS_META, type Status } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { TaskDTO } from "@/lib/types";

export function BoardColumn({
  status,
  tasks,
  onAdd,
  onOpen,
}: {
  status: Status;
  tasks: TaskDTO[];
  onAdd: (status: Status) => void;
  onOpen: (taskId: string) => void;
}) {
  const meta = STATUS_META[status];
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` });

  return (
    <section className="flex w-[17.5rem] shrink-0 flex-col lg:w-auto lg:min-w-0">
      <header className="mb-2 flex items-center gap-2 px-1.5">
        <span className={cn("size-1.5 rounded-full", meta.dot)} />
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.11em] text-muted">
          {meta.label}
        </h2>
        <span className="rounded-full bg-white/[0.05] px-1.5 py-px text-[10px] tabular-nums text-faint">
          {tasks.length}
        </span>
        <button
          type="button"
          onClick={() => onAdd(status)}
          className="ml-auto grid size-6 place-items-center rounded-md text-faint transition hover:bg-white/[0.06] hover:text-ink"
          aria-label={`Add task to ${meta.label}`}
        >
          <Plus className="size-3.5" />
        </button>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 rounded-xl border border-transparent p-1.5 transition-colors",
          isOver && "border-accent/35 bg-accent/[0.045]",
        )}
      >
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onOpen={onOpen} />
          ))}
        </SortableContext>

        {tasks.length === 0 ? (
          <div className="grid min-h-[6.5rem] place-items-center rounded-lg border border-dashed border-line/70 px-3 text-center text-[11px] text-faint">
            {isOver ? "Drop it here" : "No tasks yet"}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => onAdd(status)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-[12px] text-faint transition hover:bg-white/[0.04] hover:text-muted"
        >
          <Plus className="size-3.5" />
          Add task
        </button>
      </div>
    </section>
  );
}
