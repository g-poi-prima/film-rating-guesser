import prisma from "@/lib/prisma";
import { onlineUsers } from "../store";
import type { AppServer, AppSocket, UserData, MessagePayload } from "../types";

export function registerChatHandlers(
  io: AppServer,
  socket: AppSocket,
  user: UserData
): void {
  // ── Send message ────────────────────────────────────────────────────────────

  socket.on("chat:send", async ({ content, receiverId }) => {
    if (!content?.trim()) return;

    const message = await prisma.message.create({
      data: { senderId: user.id, receiverId: receiverId ?? null, content: content.trim() },
      include: { sender: { select: { id: true, username: true, avatar: true } } },
    });

    const payload: MessagePayload = {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      sender: message.sender,
      receiverId: message.receiverId,
    };

    if (receiverId) {
      // Private message: deliver to recipient (if online) and back to sender
      const recipientSocketId = onlineUsers.get(receiverId)?.socketId;
      if (recipientSocketId) io.to(recipientSocketId).emit("chat:message", payload);
      socket.emit("chat:message", payload);
    } else {
      // Global broadcast
      io.emit("chat:message", payload);
    }
  });

  // ── Fetch history ───────────────────────────────────────────────────────────

  socket.on("chat:get_history", async (data) => {
    const receiverId = (data as { receiverId?: number } | undefined)?.receiverId;

    const messages = await prisma.message.findMany({
      where: receiverId
        ? { OR: [{ senderId: user.id, receiverId }, { senderId: receiverId, receiverId: user.id }] }
        : { receiverId: null },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: { sender: { select: { id: true, username: true, avatar: true } } },
    });

    socket.emit(
      "chat:history",
      messages.map((m) => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt,
        sender: m.sender,
        receiverId: m.receiverId,
      }))
    );
  });
}
