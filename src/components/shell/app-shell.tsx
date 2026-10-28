"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { SocketProvider } from "@/components/realtime/socket-provider";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type Props = {
  user: { id: string; name: string; email: string; avatarColor: string };
  projects: { id: string; name: string; color: string }[];
  initialUnread: number;
  children: React.ReactNode;
};

export function AppShell({ user, projects, initialUnread, children }: Props) {
  const [navOpen, setNavOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  return (
    <SocketProvider>
      <div className="min-h-dvh bg-canvas">
        <Sidebar
          user={user}
          projects={projects}
          onNewProject={() => setNewProjectOpen(true)}
          className="fixed inset-y-0 left-0 z-40 hidden w-[268px] lg:flex"
        />

        <Dialog open={navOpen} onOpenChange={setNavOpen}>
          <DialogContent
            variant="left"
            showClose={false}
            className="border-r border-line-soft p-0 shadow-2xl"
          >
            <Sidebar
              user={user}
              projects={projects}
              onNewProject={() => {
                setNavOpen(false);
                setNewProjectOpen(true);
              }}
              onNavigate={() => setNavOpen(false)}
              className="h-full w-full border-r-0"
            />
          </DialogContent>
        </Dialog>

        <div className="flex min-h-dvh flex-col lg:pl-[268px]">
          <Topbar
            user={user}
            projects={projects}
            initialUnread={initialUnread}
            onOpenNav={() => setNavOpen(true)}
          />
          <main className="flex flex-1 flex-col">{children}</main>
        </div>

        <NewProjectDialog
          open={newProjectOpen}
          onOpenChange={setNewProjectOpen}
        />
      </div>
    </SocketProvider>
  );
}
