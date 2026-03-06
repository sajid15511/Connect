import { create } from "zustand";

export interface ChatUser {
  _id: string;
  name: string;
  email: string;
  role?: string;
  departmentId?: { _id: string; name: string } | string;
}

export interface ChatItem {
  _id: string;
  organizationId: string;
  participants: ChatUser[];
  type: "direct" | "group";
  name?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MessageItem {
  _id: string;
  chatId: string;
  senderId: ChatUser | string;
  content: string;
  createdAt: string;
}

interface AppState {
  // Chats
  chats: ChatItem[];
  setChats: (chats: ChatItem[]) => void;
  addChat: (chat: ChatItem) => void;

  // Active chat
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;

  // Messages
  messages: MessageItem[];
  setMessages: (messages: MessageItem[]) => void;
  addMessage: (message: MessageItem) => void;

  // Users
  users: ChatUser[];
  setUsers: (users: ChatUser[]) => void;

  // Online users
  onlineUsers: Set<string>;
  setUserOnline: (userId: string, online: boolean) => void;
  setOnlineUsers: (userIds: string[]) => void;

  // Typing
  typingUsers: Map<string, Set<string>>;
  setTyping: (chatId: string, userId: string, isTyping: boolean) => void;

  // Call state
  callState: CallState | null;
  setCallState: (state: CallState | null) => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export interface CallState {
  peerId: string;
  peerName: string;
  type: "audio" | "video";
  direction: "incoming" | "outgoing";
  status: "ringing" | "connected" | "ended";
  signal?: unknown;
}

export const useAppStore = create<AppState>((set) => ({
  chats: [],
  setChats: (chats) => set({ chats }),
  addChat: (chat) => set((s) => ({ chats: [chat, ...s.chats] })),

  activeChatId: null,
  setActiveChatId: (id) => set({ activeChatId: id }),

  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((s) => {
      if (s.messages.some((m) => m._id === message._id)) return s;
      return { messages: [...s.messages, message] };
    }),

  users: [],
  setUsers: (users) => set({ users }),

  onlineUsers: new Set(),
  setUserOnline: (userId, online) =>
    set((s) => {
      const next = new Set(s.onlineUsers);
      online ? next.add(userId) : next.delete(userId);
      return { onlineUsers: next };
    }),
  setOnlineUsers: (userIds) => set({ onlineUsers: new Set(userIds) }),

  typingUsers: new Map(),
  setTyping: (chatId, userId, isTyping) =>
    set((s) => {
      const next = new Map(s.typingUsers);
      const chatTyping = new Set(next.get(chatId) || []);
      isTyping ? chatTyping.add(userId) : chatTyping.delete(userId);
      next.set(chatId, chatTyping);
      return { typingUsers: next };
    }),

  callState: null,
  setCallState: (state) => set({ callState: state }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
