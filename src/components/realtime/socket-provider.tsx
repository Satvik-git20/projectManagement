"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type PresenceUser = {
  id: string;
  name: string;
  avatarColor: string;
};

type ConnectionStatus = "connecting" | "connected" | "disconnected";

type RealtimeValue = {
  connected: boolean;
  status: ConnectionStatus;
  presence: Record<string, PresenceUser[]>;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
};

const RealtimeContext = createContext<RealtimeValue | null>(null);

const BOARD_EVENTS = [
  "task:created",
  "task:updated",
  "task:moved",
  "task:deleted",
  "comment:created",
  "comment:updated",
  "comment:deleted",
  "member:added",
  "member:removed",
  "project:updated",
];

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [presence, setPresence] = useState<Record<string, PresenceUser[]>>({});
  const joined = useRef<Set<string>>(new Set());

  useEffect(() => {
    const instance = io({
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = instance;

    instance.on("connect", () => {
      setConnected(true);
      setStatus("connected");
      joined.current.forEach((projectId) => instance.emit("project:join", projectId));
    });
    instance.on("disconnect", () => {
      setConnected(false);
      setStatus("connecting");
    });
    instance.on("connect_error", () => {
      setConnected(false);
      setStatus("disconnected");
    });

    const refreshBoards = () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["task"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    };

    for (const event of BOARD_EVENTS) {
      instance.on(event, refreshBoards);
    }

    instance.on("activity:new", () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    });

    instance.on(
      "notification:new",
      (envelope: {
        payload?: { title?: string; body?: string; actor?: { name: string } };
      }) => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        const payload = envelope?.payload;
        if (!payload?.title) return;
        toast(payload.title, {
          description: payload.body,
          icon: payload.actor ? undefined : undefined,
        });
      },
    );

    instance.on(
      "presence:update",
      (envelope: { projectId: string; payload: { users: PresenceUser[] } }) => {
        setPresence((previous) => ({
          ...previous,
          [envelope.projectId]: envelope.payload.users,
        }));
      },
    );

    return () => {
      instance.removeAllListeners();
      instance.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);

  const joinProject = useCallback((projectId: string) => {
    joined.current.add(projectId);
    socketRef.current?.emit("project:join", projectId);
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    joined.current.delete(projectId);
    socketRef.current?.emit("project:leave", projectId);
    setPresence((previous) => {
      const next = { ...previous };
      delete next[projectId];
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ connected, status, presence, joinProject, leaveProject }),
    [connected, status, presence, joinProject, leaveProject],
  );

  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime must be used inside SocketProvider");
  }
  return context;
}
