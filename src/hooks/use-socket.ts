"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAppStore, type MessageItem } from "@/stores/app-store";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

interface UseSocketParams {
  userId: string;
  organizationId: string;
}

let globalSocket: Socket | null = null;

export function getSocket(): Socket | null {
  return globalSocket;
}

export function useSocket({ userId, organizationId }: UseSocketParams) {
  const socketRef = useRef<Socket | null>(null);
  const {
    addMessage,
    setUserOnline,
    setOnlineUsers,
    setTyping,
    setCallState,
    activeChatId,
  } = useAppStore();

  useEffect(() => {
    if (!userId || !organizationId) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;
    globalSocket = socket;

    socket.on("connect", () => {
      socket.emit("auth", { userId, organizationId });
    });

    socket.on("users:online", (userIds: string[]) => {
      setOnlineUsers(userIds);
    });

    socket.on("user:online", ({ userId: uid, online }: { userId: string; online: boolean }) => {
      setUserOnline(uid, online);
    });

    socket.on("message:receive", (message: MessageItem) => {
      addMessage(message);
    });

    socket.on("typing:start", ({ userId: uid, chatId }: { userId: string; chatId: string }) => {
      setTyping(chatId, uid, true);
    });

    socket.on("typing:stop", ({ userId: uid, chatId }: { userId: string; chatId: string }) => {
      setTyping(chatId, uid, false);
    });

    // Call events
    socket.on("call:incoming", ({ from, signal, type }: { from: string; signal: unknown; type: "audio" | "video" }) => {
      setCallState({
        peerId: from,
        peerName: from, // Will be resolved by UI
        type,
        direction: "incoming",
        status: "ringing",
        signal,
      });
    });

    socket.on("call:accepted", ({ signal }: { signal: unknown }) => {
      useAppStore.setState((s) =>
        s.callState ? { callState: { ...s.callState, status: "connected", signal } } : {}
      );
    });

    socket.on("call:rejected", () => {
      setCallState(null);
    });

    socket.on("call:ended", () => {
      setCallState(null);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      globalSocket = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, organizationId]);

  // Auto-join active chat room
  useEffect(() => {
    if (activeChatId && socketRef.current) {
      socketRef.current.emit("chat:join", activeChatId);
    }
  }, [activeChatId]);

  const sendMessage = useCallback((chatId: string, content: string) => {
    socketRef.current?.emit("message:send", { chatId, content });
  }, []);

  const startTyping = useCallback((chatId: string) => {
    socketRef.current?.emit("typing:start", chatId);
  }, []);

  const stopTyping = useCallback((chatId: string) => {
    socketRef.current?.emit("typing:stop", chatId);
  }, []);

  return { sendMessage, startTyping, stopTyping, socket: socketRef };
}
