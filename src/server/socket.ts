import { createServer } from "http";
import { Server, Socket } from "socket.io";
import mongoose from "mongoose";

// ── Minimal inline model loading (avoids importing from @/ aliases in standalone server) ──
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/connect-app";

const MessageSchema = new mongoose.Schema(
  {
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, default: "" },
    attachments: {
      type: [
        new mongoose.Schema(
          {
            key: { type: String, required: true },
            fileName: { type: String, required: true },
            mimeType: { type: String, required: true },
            size: { type: Number, required: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

const ChatSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    type: { type: String, enum: ["direct", "group"], default: "direct" },
    name: { type: String },
  },
  { timestamps: true }
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true, select: false },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    role: { type: String, enum: ["tenant_admin", "admin", "employee"], default: "employee" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Message = mongoose.models.Message || mongoose.model("Message", MessageSchema);
const Chat = mongoose.models.Chat || mongoose.model("Chat", ChatSchema);
const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);

// ── Types ──
interface AuthPayload {
  userId: string;
  organizationId: string;
}

interface SendMessagePayload {
  chatId: string;
  content?: string;
  attachments?: {
    key: string;
    fileName: string;
    mimeType: string;
    size: number;
  }[];
}

interface CallPayload {
  to: string;
  signal?: unknown;
  type: "audio" | "video";
}

// ── Server Setup ──
const CORS_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN.split(",").map((s) => s.trim()),
    methods: ["GET", "POST"],
  },
});

// Maps userId -> socketId for presence / call routing
const onlineUsers = new Map<string, string>();

async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
    console.log("[socket] MongoDB connected");
  }
}

io.on("connection", (socket: Socket) => {
  console.log(`[socket] Client connected: ${socket.id}`);

  // ── Authenticate & join org room ──
  socket.on("auth", (payload: AuthPayload) => {
    socket.data.userId = payload.userId;
    socket.data.organizationId = payload.organizationId;

    // Join org room for scoped broadcasts
    socket.join(`org:${payload.organizationId}`);
    onlineUsers.set(payload.userId, socket.id);

    // Broadcast presence to org
    io.to(`org:${payload.organizationId}`).emit("user:online", {
      userId: payload.userId,
      online: true,
    });

    // Send current online list
    const orgOnline = Array.from(onlineUsers.entries())
      .filter(([uid]) => uid !== payload.userId)
      .map(([uid]) => uid);
    socket.emit("users:online", orgOnline);
  });

  // ── Join a chat room ──
  socket.on("chat:join", (chatId: string) => {
    socket.join(`chat:${chatId}`);
  });

  // ── Send message ──
  socket.on("message:send", async (payload: SendMessagePayload) => {
    try {
      const content = typeof payload.content === "string" ? payload.content.trim() : "";
      const expectedPrefix = `${socket.data.organizationId}/${payload.chatId}/`;
      const attachments = Array.isArray(payload.attachments)
        ? payload.attachments
            .filter(
              (item) =>
                item &&
                typeof item.key === "string" &&
                item.key.startsWith(expectedPrefix) &&
                typeof item.fileName === "string" &&
                typeof item.mimeType === "string" &&
                typeof item.size === "number" &&
                item.size > 0 &&
                item.size <= 20 * 1024 * 1024
            )
            .slice(0, 5)
        : [];

      if (!content && attachments.length === 0) {
        return;
      }

      await connectDB();

      const chat = await Chat.findOne({
        _id: payload.chatId,
        organizationId: socket.data.organizationId,
        participants: socket.data.userId,
      });

      if (!chat) return;

      const message = await Message.create({
        chatId: payload.chatId,
        senderId: socket.data.userId,
        content,
        attachments,
      });

      const populated = await message.populate({ path: "senderId", select: "name email", model: UserModel });

      // Broadcast to all chat participants
      io.to(`chat:${payload.chatId}`).emit("message:receive", populated);
    } catch (err) {
      console.error("[socket] message:send error", err);
    }
  });

  // ── Typing indicators ──
  socket.on("typing:start", (chatId: string) => {
    socket.to(`chat:${chatId}`).emit("typing:start", {
      userId: socket.data.userId,
      chatId,
    });
  });

  socket.on("typing:stop", (chatId: string) => {
    socket.to(`chat:${chatId}`).emit("typing:stop", {
      userId: socket.data.userId,
      chatId,
    });
  });

  // ── WebRTC Signaling ──
  socket.on("call:initiate", (payload: CallPayload) => {
    const targetSocketId = onlineUsers.get(payload.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:incoming", {
        from: socket.data.userId,
        signal: payload.signal,
        type: payload.type,
      });
    }
  });

  socket.on("call:accept", (payload: CallPayload) => {
    const targetSocketId = onlineUsers.get(payload.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:accepted", {
        from: socket.data.userId,
        signal: payload.signal,
      });
    }
  });

  socket.on("call:reject", (payload: { to: string }) => {
    const targetSocketId = onlineUsers.get(payload.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:rejected", {
        from: socket.data.userId,
      });
    }
  });

  socket.on("call:end", (payload: { to: string }) => {
    const targetSocketId = onlineUsers.get(payload.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:ended", {
        from: socket.data.userId,
      });
    }
  });

  socket.on("call:ice-candidate", (payload: { to: string; candidate: unknown }) => {
    const targetSocketId = onlineUsers.get(payload.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:ice-candidate", {
        from: socket.data.userId,
        candidate: payload.candidate,
      });
    }
  });

  // ── Disconnect ──
  socket.on("disconnect", () => {
    const userId = socket.data.userId;
    const orgId = socket.data.organizationId;

    if (userId) {
      onlineUsers.delete(userId);
      if (orgId) {
        io.to(`org:${orgId}`).emit("user:online", { userId, online: false });
      }
    }
    console.log(`[socket] Client disconnected: ${socket.id}`);
  });
});

const PORT = parseInt(process.env.SOCKET_PORT || "3001", 10);

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`[socket] Socket.IO server running on port ${PORT}`);
  });
});
