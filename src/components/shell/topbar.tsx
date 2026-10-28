"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, Wifi, WifiOff } from "lucide-react";
import { NotificationBell } from "@/components/shell/notification-bell";
import { UserMenu } from "@/components/shell/user-menu";
import { useRealtime } from "@/components/realtime/socket-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  user: { name: string; email: string; avatarColor: string };
  projects: { id: string; name: string; color: string }[];
  initialUnread: number;
  onOpenNav: () => void;
};

export function Topbar({ user, projects, initialUnread, onOpenNav }: Props) {
  const pathname = usePathname();
  const { connected, status } = useRealtime();
  const activeProject = projects.find((project) =>
    pathname.startsWith(`/projects/${project.id}`),
  );

  return (
    <header className="glass sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line-soft px-4 sm:px-6">
      <button
        onClick={onOpenNav}
        className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-white/[0.05] hover:text-ink lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-[18px]" />
      </button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
        <Link
          href="/projects"
          className="shrink-0 text-muted transition hover:text-ink"
        >
          Projects
        </Link>
        {activeProject ? (
          <>
            <ChevronRight className="size-3.5 shrink-0 text-faint" />
            <span className="flex min-w-0 items-center gap-1.5 font-medium text-ink">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: activeProject.color }}
              />
              <span className="truncate">{activeProject.name}</span>
            </span>
          </>
        ) : null}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="hidden items-center gap-1.5 rounded-full border border-line-soft px-2.5 py-1 text-[11px] font-medium text-muted sm:flex"
              aria-live="polite"
            >
              {connected ? (
                <>
                  <Wifi className="size-3 text-emerald-400" />
                  Live
                </>
              ) : (
                <>
                  <WifiOff className="size-3 text-amber-400" />
                  {status === "connecting" ? "Connecting…" : "Reconnecting"}
                </>
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {connected
              ? "Real-time updates are connected"
              : status === "connecting"
                ? "Opening the real-time connection"
                : "Socket disconnected — retrying automatically"}
          </TooltipContent>
        </Tooltip>

        <NotificationBell initialUnread={initialUnread} />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
