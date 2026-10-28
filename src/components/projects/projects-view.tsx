"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  FolderPlus,
  KeyRound,
  Loader2,
  Plus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError, Input, Label } from "@/components/ui/input";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { apiFetch } from "@/lib/http";
import { formatRelative } from "@/lib/utils";
import type { ProjectSummaryDTO } from "@/lib/types";

export function ProjectsView({
  projects,
  firstName,
}: {
  projects: ProjectSummaryDTO[];
  firstName: string;
}) {
  const [newOpen, setNewOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const teammateCount = new Set(
    projects.flatMap((project) => project.members.map((member) => member.id)),
  ).size;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
            Workspace
          </p>
          <h1 className="mt-1 text-[1.65rem] font-semibold tracking-tight">
            Good to see you, {firstName}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {projects.length} {projects.length === 1 ? "board" : "boards"} ·{" "}
            {teammateCount} {teammateCount === 1 ? "teammate" : "teammates"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md" onClick={() => setJoinOpen(true)}>
            <KeyRound className="size-4" />
            Join with code
          </Button>
          <Button size="md" onClick={() => setNewOpen(true)}>
            <Plus className="size-4" />
            New project
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyProjects onCreate={() => setNewOpen(true)} onJoin={() => setJoinOpen(true)} />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>
      )}

      <NewProjectDialog open={newOpen} onOpenChange={setNewOpen} />
      <JoinProjectDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </div>
  );
}

function ProjectCard({
  project,
  index,
}: {
  project: ProjectSummaryDTO;
  index: number;
}) {
  const progress =
    project.taskCount === 0
      ? 0
      : Math.round((project.doneCount / project.taskCount) * 100);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group surface-panel relative flex animate-rise flex-col overflow-hidden rounded-xl p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#2f3646] hover:bg-raised/80"
      style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full opacity-20 blur-3xl transition group-hover:opacity-35"
        style={{ backgroundColor: project.color }}
      />

      <div className="flex items-start justify-between gap-3">
        <span
          className="grid size-10 place-items-center rounded-lg text-sm font-semibold uppercase"
          style={{
            backgroundColor: `${project.color}1f`,
            color: project.color,
            boxShadow: `inset 0 0 0 1px ${project.color}45`,
          }}
        >
          {project.name.slice(0, 1)}
        </span>
        <div className="flex items-center gap-1.5">
          {project.role !== "MEMBER" ? (
            <Badge variant="accent">{project.role.toLowerCase()}</Badge>
          ) : null}
          <ArrowUpRight className="size-4 text-faint opacity-0 transition group-hover:opacity-100" />
        </div>
      </div>

      <h2 className="mt-3.5 text-[15px] font-medium tracking-tight text-ink">
        {project.name}
      </h2>
      <p className="mt-1 line-clamp-2 min-h-[2.2rem] text-[12.5px] leading-relaxed text-muted">
        {project.description || "No description yet."}
      </p>

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between text-[11px] text-faint">
          <span>
            {project.doneCount}/{project.taskCount} done
          </span>
          <span className="tabular-nums">{progress}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              backgroundColor: project.color,
            }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <AvatarStack users={project.members} max={4} />
          <span className="flex items-center gap-1 text-[11px] text-faint">
            <Users className="size-3" />
            {project.memberCount}
            <span className="mx-1 text-line">|</span>
            {formatRelative(project.updatedAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyProjects({
  onCreate,
  onJoin,
}: {
  onCreate: () => void;
  onJoin: () => void;
}) {
  return (
    <div className="mt-10 grid place-items-center rounded-2xl border border-dashed border-line bg-surface/40 px-6 py-16 text-center">
      <div className="grid size-12 place-items-center rounded-xl bg-accent/12 text-accent-soft ring-1 ring-inset ring-accent/25">
        <FolderPlus className="size-5" />
      </div>
      <h2 className="mt-4 text-base font-medium">No boards yet</h2>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">
        Create a project for your team, then invite people with a join code.
        Every board starts with a few columns and a lot of room.
      </p>
      <div className="mt-5 flex gap-2">
        <Button onClick={onCreate}>
          <Plus className="size-4" />
          Create your first project
        </Button>
        <Button variant="secondary" onClick={onJoin}>
          <KeyRound className="size-4" />
          Join with code
        </Button>
      </div>
    </div>
  );
}

function JoinProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<{ projectId: string; projectName: string; alreadyMember: boolean }>(
        "/api/projects/join",
        { json: { code: code.trim() } },
      ),
    onSuccess: ({ projectId, projectName, alreadyMember }) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(
        alreadyMember ? `Opening ${projectName}` : `Joined ${projectName}`,
      );
      onOpenChange(false);
      setCode("");
      router.push(`/projects/${projectId}`);
      router.refresh();
    },
    onError: (caught) => setError(caught.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6">
        <DialogTitle>Join a project</DialogTitle>
        <DialogDescription>
          Paste the join code a teammate shared with you. Codes look like{" "}
          <span className="font-mono text-muted">WEB-8F3K</span>.
        </DialogDescription>

        <form
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            mutation.mutate();
          }}
        >
          <Label htmlFor="join-code">Join code</Label>
          <Input
            id="join-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="WEB-8F3K"
            className="font-mono tracking-widest"
            maxLength={24}
            autoFocus
            required
          />
          <FieldError>{error}</FieldError>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              Join project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
