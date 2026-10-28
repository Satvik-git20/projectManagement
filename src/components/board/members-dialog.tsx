"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Loader2, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError, Input, Label } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/http";
import { canManageRole } from "@/lib/permissions-client";
import { cn, formatRelative } from "@/lib/utils";
import type { MemberDTO } from "@/lib/types";
import type { Role } from "@/lib/constants";

type Props = {
  project: { id: string; name: string; joinCode: string };
  members: MemberDTO[];
  role: Role;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MembersDialog({
  project,
  members,
  role,
  currentUserId,
  open,
  onOpenChange,
}: Props) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const canManage = canManageRole(role);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["board", project.id] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const invite = useMutation({
    mutationFn: () =>
      apiFetch(`/api/projects/${project.id}/members`, {
        json: { email: email.trim() },
      }),
    onSuccess: () => {
      setEmail("");
      setError(null);
      invalidate();
      toast.success("Teammate added to the project");
    },
    onError: (caught) => setError(caught.message),
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, next }: { userId: string; next: string }) =>
      apiFetch(`/api/projects/${project.id}/members/${userId}`, {
        method: "PATCH",
        json: { role: next },
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Role updated");
    },
    onError: (caught: Error) => toast.error(caught.message),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/api/projects/${project.id}/members/${userId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      setConfirmRemove(null);
      invalidate();
      toast.success("Member removed");
    },
    onError: (caught: Error) => toast.error(caught.message),
  });

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(project.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — select the code manually");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6">
        <DialogTitle>Project members</DialogTitle>
        <DialogDescription>
          {members.length} {members.length === 1 ? "person" : "people"} on{" "}
          {project.name}
        </DialogDescription>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-line-soft bg-raised/60 px-3 py-2.5">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-faint">
              Join code
            </p>
            <p className="mt-0.5 font-mono text-sm tracking-[0.12em] text-ink">
              {project.joinCode}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={copyCode}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        {canManage ? (
          <form
            className="mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              invite.mutate();
            }}
          >
            <Label htmlFor="invite-email">Invite by email</Label>
            <div className="flex gap-2">
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@company.com"
                maxLength={254}
                required
              />
              <Button type="submit" disabled={invite.isPending} className="shrink-0">
                {invite.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserPlus className="size-4" />
                )}
                Add
              </Button>
            </div>
            <FieldError>{error}</FieldError>
            <p className="mt-1.5 text-[11px] text-faint">
              They need a TaskFlow account first — anyone can create one in seconds.
            </p>
          </form>
        ) : null}

        <ul className="mt-5 divide-y divide-line-soft border-t border-line-soft">
          {members.map((member) => {
            const isSelf = member.user.id === currentUserId;
            const isOwner = member.role === "OWNER";
            const editable =
              canManage &&
              !isOwner &&
              (role === "OWNER" || member.role === "MEMBER");
            const removable =
              !isOwner &&
              (role === "OWNER" || (role === "ADMIN" && member.role === "MEMBER"));

            return (
              <li key={member.id} className="flex items-center gap-3 py-3">
                <Avatar
                  name={member.user.name}
                  color={member.user.avatarColor}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-ink">
                    {member.user.name}
                    {isSelf ? (
                      <span className="text-[10px] font-normal text-faint">you</span>
                    ) : null}
                  </p>
                  <p className="truncate text-[11px] text-faint">
                    {member.user.email} · joined {formatRelative(member.joinedAt)}
                  </p>
                </div>

                {editable ? (
                  <Select
                    value={member.role}
                    onValueChange={(next) =>
                      changeRole.mutate({ userId: member.user.id, next })
                    }
                  >
                    <SelectTrigger
                      className="h-8 w-[6.6rem] text-[11.5px]"
                      aria-label={`Role for ${member.user.name}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={isOwner ? "accent" : "neutral"}>
                    {member.role.toLowerCase()}
                  </Badge>
                )}

                {removable && !isSelf ? (
                  confirmRemove === member.user.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon-sm"
                        variant="danger"
                        onClick={() => removeMember.mutate(member.user.id)}
                        aria-label={`Confirm removing ${member.user.name}`}
                      >
                        <Check />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setConfirmRemove(null)}
                        aria-label="Cancel"
                      >
                        <UserMinus />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRemove(member.user.id)}
                      className={cn(
                        "grid size-7 place-items-center rounded-md text-faint transition hover:bg-rose-500/10 hover:text-rose-300",
                      )}
                      aria-label={`Remove ${member.user.name}`}
                    >
                      <UserMinus className="size-3.5" />
                    </button>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
