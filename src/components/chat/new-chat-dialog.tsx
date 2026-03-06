"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useAppStore, type ChatUser } from "@/stores/app-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check } from "lucide-react";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewChatDialog({ open, onOpenChange }: NewChatDialogProps) {
  const { data: session } = useSession();
  const { users, addChat, setActiveChatId, setMessages } = useAppStore();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const userId = session?.user?.id ?? "";
  const otherUsers = users.filter(
    (u) => u._id !== userId && u.role !== "admin" && u.role !== "tenant_admin"
  );

  const toggleUser = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleCreate = async () => {
    if (selected.size === 0) return;
    setLoading(true);

    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: Array.from(selected),
          type: selected.size === 1 ? "direct" : "group",
          name: selected.size > 1 ? name : undefined,
        }),
      });

      const chat = await res.json();
      addChat(chat);
      setActiveChatId(chat._id);
      setMessages([]);
      onOpenChange(false);
      setName("");
      setSelected(new Set());
    } catch (err) {
      console.error("Failed to create chat", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Group Chat</DialogTitle>
          <DialogDescription>Select members and give the group a name.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Group Name</Label>
            <Input
              placeholder="e.g. Engineering Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Members ({selected.size} selected)</Label>
            <div className="mt-2 max-h-60 space-y-1 overflow-y-auto">
              {otherUsers.map((user) => {
                const isSelected = selected.has(user._id);
                return (
                  <button
                    key={user._id}
                    onClick={() => toggleUser(user._id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                      isSelected ? "bg-primary/10" : "hover:bg-accent"
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          <Button onClick={handleCreate} disabled={selected.size < 2 || !name || loading} className="w-full">
            {loading ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
