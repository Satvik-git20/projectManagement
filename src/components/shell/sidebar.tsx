"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CircleDot,
  Layers,
  LayoutGrid,
  LogOut,
  Plus,
  Settings2,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/http";
import { cn } from "@/lib/utils";
import type { ProjectSummaryDTO } from "@/lib/types";

type Props = {
  user: { id: string; name: string; email: string; avatarColor: string };
  projects: Pick<ProjectSummaryDTO, "id" | "name" | "color">[];
  onNavigate?: () => void;
  onNewProject: () => void;
  className?: string;
};

export function Sidebar({
  user,
  projects,
  onNavigate,
  onNewProject,
  className,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-line-soft bg-surface/70",
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 pb-3 pt-5">
        <Link
          href="/projects"
          onClick={onNavigate}
          className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-accent/15 text-accent-soft ring-1 ring-inset ring-accent/30">
            <Layers className="size-4" />
          </span>
          TaskFlow
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onNewProject}
          aria-label="New project"
          title="New project"
        >
          <Plus />
        </Button>
      </div>

      <div className="px-3 pb-2">
        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-start gap-2 text-muted"
          onClick={onNewProject}
        >
          <Plus className="size-3.5" />
          New project
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label="Projects">
        <Link
          href="/projects"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition",
            pathname === "/projects"
              ? "bg-white/[0.06] text-ink"
              : "text-muted hover:bg-white/[0.035] hover:text-ink",
          )}
        >
          <LayoutGrid className="size-4 text-faint" />
          All projects
        </Link>

        <div className="mt-5 flex items-center justify-between px-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
            Your boards
          </span>
          <span className="text-[10px] tabular-nums text-faint">
            {projects.length}
          </span>
        </div>

        <div className="mt-1.5 space-y-0.5">
          {projects.length === 0 ? (
            <p className="px-2.5 py-3 text-xs leading-relaxed text-faint">
              No boards yet. Create one to get started.
            </p>
          ) : (
            projects.map((project) => {
              const href = `/projects/${project.id}`;
              const active = pathname === href;
              return (
                <Link
                  key={project.id}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition",
                    active
                      ? "bg-white/[0.06] text-ink"
                      : "text-muted hover:bg-white/[0.035] hover:text-ink",
                  )}
                >
                  <span
                    className="size-2 shrink-0 rounded-full ring-2 ring-inset ring-white/10"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="truncate">{project.name}</span>
                  {active ? (
                    <CircleDot className="ml-auto size-3 text-accent-soft" />
                  ) : null}
                </Link>
              );
            })
          )}
        </div>
      </nav>

      <div className="border-t border-line-soft p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
          <Avatar name={user.name} color={user.avatarColor} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink">
              {user.name}
            </p>
            <p className="truncate text-[11px] text-faint">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={signOut}
            disabled={signingOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut />
          </Button>
        </div>
        <p className="mt-1 flex items-center gap-1.5 px-1.5 text-[10px] text-faint">
          <Settings2 className="size-3" />
          Session secured with an httpOnly cookie
        </p>
      </div>
    </aside>
  );
}
