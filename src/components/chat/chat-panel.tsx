"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useAppStore, type ChatUser, type MessageAttachment } from "@/stores/app-store";
import { useSocket } from "@/hooks/use-socket";
import { useCall } from "@/hooks/use-call";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Phone, Video, Send, MessageSquare, Paperclip, FileText, Download, X, Loader2 } from "lucide-react";

const MAX_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_MESSAGE = 5;

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getSenderInfo(sender: ChatUser | string): { name: string; id: string } {
  if (typeof sender === "string") return { name: "Unknown", id: sender };
  return { name: sender.name, id: sender._id };
}

async function parseErrorMessage(response: Response) {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") {
      return data.error;
    }

    if (data?.error && typeof data.error === "object") {
      const first = Object.values(data.error).flat()[0];
      if (typeof first === "string") {
        return first;
      }
    }

    return "Request failed";
  } catch {
    return "Request failed";
  }
}

export function ChatPanel() {
  const { data: session } = useSession();
  const { activeChatId, chats, messages, onlineUsers, typingUsers, users } = useAppStore();
  const { sendMessage, startTyping, stopTyping } = useSocket({
    userId: session?.user?.id ?? "",
    organizationId: session?.user?.organizationId ?? "",
  });
  const { startCall } = useCall();

  const [input, setInput] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // @mention state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(-1);

  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const userId = session?.user?.id ?? "";
  const activeChat = chats.find((c) => c._id === activeChatId);

  const canSend = Boolean(activeChatId) && !isUploading && (!!input.trim() || pendingAttachments.length > 0);

  useEffect(() => {
    setPendingAttachments([]);
    setUploadError("");
  }, [activeChatId]);

  // Typing indicator (computed early so useEffect can depend on it)
  const chatTypingUsers = activeChatId ? typingUsers.get(activeChatId) : undefined;
  const typingNames = chatTypingUsers
    ? Array.from(chatTypingUsers)
        .filter((id) => id !== userId)
        .map((id) => users.find((u) => u._id === id)?.name || "Someone")
    : [];

  // Get mentionable users for current chat
  const mentionableUsers = useMemo(() => {
    if (!activeChat) return [];
    if (activeChat.type === "group") {
      // All participants except self
      return activeChat.participants.filter((p) => p._id !== userId);
    }
    // Direct chat: just the other person
    const other = activeChat.participants.find((p) => p._id !== userId);
    return other ? [other] : [];
  }, [activeChat, userId]);

  // Filtered mentions based on query
  const filteredMentions = useMemo(() => {
    if (!mentionQuery) return mentionableUsers;
    const q = mentionQuery.toLowerCase();
    return mentionableUsers.filter((u) => u.name.toLowerCase().includes(q));
  }, [mentionableUsers, mentionQuery]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingNames.length]);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 150) + "px";
  }, []);

  const handleSend = useCallback(() => {
    if (!activeChatId || isUploading) return;

    const trimmedInput = input.trim();
    if (!trimmedInput && pendingAttachments.length === 0) return;

    sendMessage(activeChatId, trimmedInput, pendingAttachments);
    setInput("");
    setPendingAttachments([]);
    setUploadError("");
    setShowMentions(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    stopTyping(activeChatId);
    // Reset textarea height
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }, 0);
  }, [activeChatId, input, isUploading, pendingAttachments, sendMessage, stopTyping]);

  const handlePickFiles = useCallback(() => {
    if (!activeChatId || isUploading) return;
    fileInputRef.current?.click();
  }, [activeChatId, isUploading]);

  const handleRemovePendingAttachment = useCallback((key: string) => {
    setPendingAttachments((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      e.target.value = "";

      if (!activeChatId || files.length === 0 || isUploading) return;

      const availableSlots = Math.max(MAX_ATTACHMENTS_PER_MESSAGE - pendingAttachments.length, 0);
      if (availableSlots === 0) {
        setUploadError(`You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`);
        return;
      }

      const selectedFiles = files.slice(0, availableSlots);
      const errors: string[] = [];
      const uploaded: MessageAttachment[] = [];

      if (files.length > selectedFiles.length) {
        errors.push(`Only ${availableSlots} more file(s) can be attached.`);
      }

      setUploadError("");
      setIsUploading(true);

      for (const file of selectedFiles) {
        if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
          errors.push(`${file.name} exceeds 20MB.`);
          continue;
        }

        try {
          const presignRes = await fetch("/api/uploads/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatId: activeChatId,
              fileName: file.name,
              contentType: file.type || "application/octet-stream",
              size: file.size,
            }),
          });

          if (!presignRes.ok) {
            throw new Error(await parseErrorMessage(presignRes));
          }

          const presignData = (await presignRes.json()) as {
            uploadUrl: string;
            attachment: MessageAttachment;
          };

          const uploadRes = await fetch(presignData.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
            body: file,
          });

          if (!uploadRes.ok) {
            throw new Error(`Upload failed for ${file.name}`);
          }

          uploaded.push(presignData.attachment);
        } catch (error) {
          const message = error instanceof Error ? error.message : `Upload failed for ${file.name}`;
          errors.push(message);
        }
      }

      if (uploaded.length > 0) {
        setPendingAttachments((prev) => [...prev, ...uploaded].slice(0, MAX_ATTACHMENTS_PER_MESSAGE));
      }

      if (errors.length > 0) {
        setUploadError(errors[0]);
      }

      setIsUploading(false);
    },
    [activeChatId, isUploading, pendingAttachments.length]
  );

  const handleDownloadAttachment = useCallback(async (attachment: MessageAttachment) => {
    try {
      const params = new URLSearchParams({
        key: attachment.key,
        fileName: attachment.fileName,
      });

      const res = await fetch(`/api/uploads/download?${params.toString()}`);
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }

      const data = (await res.json()) as { url: string };
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not open file";
      setUploadError(message);
    }
  }, []);

  const insertMention = useCallback(
    (user: ChatUser) => {
      const before = input.slice(0, mentionStartPos);
      const after = input.slice(textareaRef.current?.selectionStart ?? input.length);
      const newInput = `${before}@${user.name} ${after}`;
      setInput(newInput);
      setShowMentions(false);
      setMentionQuery("");
      setMentionStartPos(-1);
      setTimeout(() => {
        const pos = before.length + user.name.length + 2; // +2 for @ and space
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(pos, pos);
        autoResize();
      }, 0);
    },
    [input, mentionStartPos, autoResize]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Mention navigation
    if (showMentions && filteredMentions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % filteredMentions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + filteredMentions.length) % filteredMentions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMentions[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

    // Ctrl+Enter = new line, Enter = send
    if (e.key === "Enter") {
      if (e.ctrlKey || e.metaKey) {
        // Insert newline at cursor
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newVal = input.slice(0, start) + "\n" + input.slice(end);
        setInput(newVal);
        setTimeout(() => {
          ta.selectionStart = ta.selectionEnd = start + 1;
          autoResize();
        }, 0);
      } else if (!e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    autoResize();

    if (!activeChatId) return;

    // Typing indicators
    startTyping(activeChatId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(activeChatId);
    }, 2000);

    // @mention detection
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setShowMentions(true);
      setMentionQuery(atMatch[1]);
      setMentionStartPos(cursorPos - atMatch[0].length);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionQuery("");
      setMentionStartPos(-1);
    }
  };

  // Get peer for direct chat (for calling)
  const peer =
    activeChat?.type === "direct"
      ? activeChat.participants.find((p) => p._id !== userId)
      : null;

  const peerOnline = peer ? onlineUsers.has(peer._id) : false;

  if (!activeChat) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <div className="text-center">
          <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-lg font-medium text-muted-foreground">No chat selected</h2>
          <p className="text-sm text-muted-foreground/60">Choose a conversation from the sidebar</p>
        </div>
      </div>
    );
  }

  const chatName =
    activeChat.type === "group"
      ? activeChat.name || "Group Chat"
      : peer?.name || "Unknown";

  return (
    <div className="flex flex-1 flex-col bg-background">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">
              {activeChat.type === "group" ? "G" : getInitials(chatName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-sm font-semibold">{chatName}</h2>
            <p className="text-xs text-muted-foreground">
              {activeChat.type === "group"
                ? `${activeChat.participants.length} members`
                : peerOnline
                ? "Online"
                : "Offline"}
            </p>
          </div>
        </div>

        {/* Call Buttons (direct chat only) */}
        {peer && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => startCall(peer._id, peer.name, "audio")}
              disabled={!peerOnline}
              title="Audio call"
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => startCall(peer._id, peer.name, "video")}
              disabled={!peerOnline}
              title="Video call"
            >
              <Video className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4"
      >
        <div className="space-y-4">
          {messages.map((msg, i) => {
            const sender = getSenderInfo(msg.senderId);
            const isMe = sender.id === userId;
            const messageAttachments = msg.attachments || [];
            const hasTextContent = Boolean(msg.content?.trim());
            const showAvatar =
              i === 0 || getSenderInfo(messages[i - 1].senderId).id !== sender.id;

            return (
              <div
                key={msg._id}
                className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}
              >
                {showAvatar ? (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs">{getInitials(sender.name)}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-8" />
                )}

                <div className={`max-w-[70%] ${isMe ? "text-right" : ""}`}>
                  {showAvatar && (
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {isMe ? "You" : sender.name}
                    </p>
                  )}

                  {hasTextContent && (
                    <div
                      className={`inline-block rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                        isMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {msg.content}
                    </div>
                  )}

                  {messageAttachments.length > 0 && (
                    <div className={`mt-2 space-y-1 ${isMe ? "ml-auto" : ""}`}>
                      {messageAttachments.map((attachment) => (
                        <button
                          key={attachment.key}
                          type="button"
                          onClick={() => handleDownloadAttachment(attachment)}
                          className={`flex w-full min-w-[220px] items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors hover:bg-accent/50 ${
                            isMe ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium">{attachment.fileName}</p>
                              <p className="text-[10px] text-muted-foreground">{formatFileSize(attachment.size)}</p>
                            </div>
                          </div>
                          <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="mt-0.5 text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</p>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {typingNames.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex gap-0.5">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
              </span>
              {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} typing
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <Separator />
      <div className="relative p-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* @Mention Dropdown */}
        {showMentions && filteredMentions.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-1 max-h-48 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
            {filteredMentions.map((user, i) => (
              <button
                key={user._id}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  i === mentionIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur
                  insertMention(user);
                }}
                onMouseEnter={() => setMentionIndex(i)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {pendingAttachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingAttachments.map((attachment) => (
              <div
                key={attachment.key}
                className="flex max-w-full items-center gap-2 rounded-md border bg-muted/40 px-2 py-1"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{attachment.fileName}</p>
                  <p className="text-[10px] text-muted-foreground">{formatFileSize(attachment.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePendingAttachment(attachment.key)}
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Remove attachment"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handlePickFiles}
            disabled={!activeChatId || isUploading || pendingAttachments.length >= MAX_ATTACHMENTS_PER_MESSAGE}
            className="shrink-0"
            title="Attach file"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </Button>

          <textarea
            ref={textareaRef}
            placeholder="Type a message or attach files..."
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            style={{ minHeight: "36px", maxHeight: "150px" }}
          />
          <Button onClick={handleSend} disabled={!canSend} size="icon" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Enter to send · Ctrl+Enter for new line · @ to mention · Max {MAX_ATTACHMENTS_PER_MESSAGE} files ({formatFileSize(MAX_ATTACHMENT_SIZE_BYTES)} each)
        </p>
        {uploadError && <p className="mt-1 text-[11px] text-destructive">{uploadError}</p>}
      </div>
    </div>
  );
}
