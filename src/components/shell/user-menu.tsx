"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/http";

export function UserMenu({
  user,
}: {
  user: { name: string; email: string; avatarColor: string };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full ring-offset-2 ring-offset-canvas transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/70"
          aria-label="Account menu"
        >
          <Avatar name={user.name} color={user.avatarColor} size="md" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
        <div className="flex items-center gap-2.5 px-2.5 pb-2.5 pt-1">
          <Avatar name={user.name} color={user.avatarColor} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink">
              {user.name}
            </p>
            <p className="truncate text-[11px] text-faint">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => void signOut()}
          disabled={pending}
          className="text-rose-300/85 data-[highlighted]:bg-rose-500/10 data-[highlighted]:text-rose-200"
        >
          <LogOut />
          {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
