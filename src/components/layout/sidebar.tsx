"use client";

import { useSession, signOut } from "next-auth/react";
import { useAppStore, type ChatItem, type ChatUser } from "@/stores/app-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Users,
  Plus,
  LogOut,
  Search,
  Building2,
} from "lucide-react";
import { useState } from "react";
import { NewChatDialog } from "@/components/chat/new-chat-dialog";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getChatDisplayName(chat: ChatItem, currentUserId: string): string {
  if (chat.type === "group") return chat.name || "Group Chat";
  const other = chat.participants.find((p) => p._id !== currentUserId);
  return other?.name || "Unknown";
}

export function Sidebar() {
  const { data: session } = useSession();
  const {
    chats,
    activeChatId,
    setActiveChatId,
    onlineUsers,
    users,
    setMessages,
  } = useAppStore();
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [view, setView] = useState<"chats" | "users">("chats");

  const userId = session?.user?.id ?? "";

  const filteredChats = chats.filter((c) => {
    const name = getChatDisplayName(c, userId);
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const filteredUsers = users.filter(
    (u) =>
      u._id !== userId &&
      u.role !== "admin" &&
      u.role !== "tenant_admin" &&
      u.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleChatClick = async (chatId: string) => {
    setActiveChatId(chatId);
    try {
      const res = await fetch(`/api/messages?chatId=${chatId}`);
      const msgs = await res.json();
      setMessages(msgs);
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  };

  const handleUserClick = async (user: ChatUser) => {
    // Create or get direct chat
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: [user._id], type: "direct" }),
      });
      const chat = await res.json();

      // Add to chats if not exists
      const store = useAppStore.getState();
      if (!store.chats.find((c) => c._id === chat._id)) {
        store.addChat(chat);
      }
      handleChatClick(chat._id);
      setView("chats");
    } catch (err) {
      console.error("Failed to create chat", err);
    }
  };

  return (
    <div className="flex h-full w-80 flex-col border-r bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Connect</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => signOut()}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {/* User Info */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {getInitials(session?.user?.name || "")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{session?.user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{session?.user?.email}</p>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {session?.user?.role}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-1 px-3 pb-2">
        <Button
          variant={view === "chats" ? "secondary" : "ghost"}
          size="sm"
          className="flex-1"
          onClick={() => setView("chats")}
        >
          <MessageSquare className="mr-1 h-3.5 w-3.5" />
          Chats
        </Button>
        <Button
          variant={view === "users" ? "secondary" : "ghost"}
          size="sm"
          className="flex-1"
          onClick={() => setView("users")}
        >
          <Users className="mr-1 h-3.5 w-3.5" />
          People
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {view === "chats" ? (
          <div className="space-y-0.5 p-2">
            {filteredChats.map((chat) => {
              const isActive = chat._id === activeChatId;
              const displayName = getChatDisplayName(chat, userId);
              const other = chat.participants.find((p) => p._id !== userId);
              const isOnline = other ? onlineUsers.has(other._id) : false;

              return (
                <button
                  key={chat._id}
                  onClick={() => handleChatClick(chat._id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent ${
                    isActive ? "bg-accent" : ""
                  }`}
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">
                        {chat.type === "group" ? "G" : getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    {chat.type === "direct" && (
                      <span
                        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card ${
                          isOnline ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {chat.type === "group" ? `${chat.participants.length} members` : isOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                </button>
              );
            })}

            {filteredChats.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">No chats yet</p>
            )}
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {filteredUsers.map((user) => {
              const isOnline = onlineUsers.has(user._id);
              return (
                <button
                  key={user._id}
                  onClick={() => handleUserClick(user)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card ${
                        isOnline ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* New Chat Button */}
      <div className="p-3">
        <Button className="w-full" onClick={() => setShowNewChat(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Group Chat
        </Button>
      </div>

      <NewChatDialog open={showNewChat} onOpenChange={setShowNewChat} />
    </div>
  );
}
