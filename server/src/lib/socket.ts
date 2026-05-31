import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { getEnv } from "@/utils";
import prisma from "@/lib/prisma";
import { onlineUsers, removeFromQueue, broadcastOnline } from "./socket/store";
import { registerMatchHandlers, handleMatchDisconnect } from "./socket/handlers/match";
import { registerChatHandlers } from "./socket/handlers/chat";
import { registerLobbyHandlers, handleLobbyDisconnect } from "./socket/handlers/lobby";
import type { AppServer, ServerToClientEvents, ClientToServerEvents, UserData } from "./socket/types";

// Cache once at module load
const JWT_SECRET = getEnv("JWT_SECRET");

let _io: AppServer | null = null;
export function getIO(): AppServer | null { return _io; }

export function setupSocket(httpServer: HTTPServer): void {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, { user: UserData }>(
    httpServer,
    { cors: { origin: "*" } }
  );
  _io = io;

  // ── Auth middleware ─────────────────────────────────────────────────────────

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Token mancante"));

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, username: true },
      });
      if (!user) return next(new Error("Utente non trovato"));
      socket.data.user = user;
      next();
    } catch {
      next(new Error("Token non valido"));
    }
  });

  // ── Connection handler ──────────────────────────────────────────────────────

  io.on("connection", (socket) => {
    const user = socket.data.user;
    onlineUsers.set(user.id, { socketId: socket.id, username: user.username });
    broadcastOnline(io);

    registerMatchHandlers(io, socket, user);
    registerChatHandlers(io, socket, user);
    registerLobbyHandlers(io, socket, user);

    socket.on("disconnect", async () => {
      onlineUsers.delete(user.id);
      removeFromQueue(user.id);
      await handleMatchDisconnect(io, user.id);
      await handleLobbyDisconnect(io, user.id);
      broadcastOnline(io);
    });
  });
}
