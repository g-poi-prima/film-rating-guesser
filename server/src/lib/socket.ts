import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import prisma from "./prisma";
import { getEnv } from "@/utils";
import { getRandomMovie } from "./tmdb";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserData {
  id: number;
  username: string;
}

interface MoviePayload {
  id: number;
  title: string;
  overview: string;
  poster: string | null;
}

interface MatchStartPayload {
  matchId: number;
  movie: MoviePayload;
  opponentUsername: string;
}

interface MatchEndPayload {
  matchId: number;
  realRating: number;
  yourRating: number;
  yourScore: number;
  opponentUsername: string;
  opponentRating: number;
  opponentScore: number;
}

interface MessagePayload {
  id: number;
  content: string;
  createdAt: Date;
  sender: { id: number; username: string; avatar: string | null };
  receiverId: number | null;
}

interface ServerToClientEvents {
  "users:online": (userIds: number[]) => void;
  "match:queue_joined": () => void;
  "match:queue_left": () => void;
  "match:start": (data: MatchStartPayload) => void;
  "match:opponent_submitted": () => void;
  "match:end": (data: MatchEndPayload) => void;
  "match:opponent_disconnected": () => void;
  "chat:message": (msg: MessagePayload) => void;
  "chat:history": (msgs: MessagePayload[]) => void;
}

interface ClientToServerEvents {
  "match:join_queue": () => void;
  "match:leave_queue": () => void;
  "match:submit": (data: { matchId: number; userRating: number }) => void;
  "chat:send": (data: { content: string; receiverId?: number }) => void;
  "chat:get_history": (data: { receiverId?: number }) => void;
}

// ─── In-memory state ─────────────────────────────────────────────────────────

interface MatchRoom {
  matchId: number;
  player1Id: number;
  player2Id: number;
  movie: MoviePayload;
  realRating: number;
  ratings: Map<number, number>; // userId → submitted rating
}

const onlineUsers = new Map<number, string>(); // userId → socketId
const matchQueue: number[] = [];               // userIds waiting for opponent
const matchRooms = new Map<number, MatchRoom>(); // matchId → room state

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcScore(diff: number): number {
  if (diff <= 0.5) return 100;
  if (diff <= 1) return 80;
  if (diff <= 2) return 60;
  if (diff <= 3) return 40;
  if (diff <= 4) return 20;
  return 0;
}

function removeFromQueue(userId: number) {
  const idx = matchQueue.indexOf(userId);
  if (idx !== -1) matchQueue.splice(idx, 1);
}

// ─── Setup ───────────────────────────────────────────────────────────────────

export function setupSocket(httpServer: HTTPServer) {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    { user: UserData }
  >(httpServer, {
    cors: { origin: "*" },
  });

  // JWT auth middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Token mancante"));
    try {
      const decoded = jwt.verify(token, getEnv("JWT_SECRET")) as { id: number };
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

  io.on("connection", (socket) => {
    const user = socket.data.user;
    onlineUsers.set(user.id, socket.id);
    io.emit("users:online", Array.from(onlineUsers.keys()));

    // ── Matchmaking ──────────────────────────────────────────────────────────

    socket.on("match:join_queue", async () => {
      if (matchQueue.includes(user.id)) return;
      matchQueue.push(user.id);
      socket.emit("match:queue_joined");

      if (matchQueue.length < 2) return;

      const p1Id = matchQueue.shift()!;
      const p2Id = matchQueue.shift()!;

      try {
        const movieData = await getRandomMovie();

        const match = await prisma.match.create({
          data: {
            player1Id: p1Id,
            player2Id: p2Id,
            movieId: movieData.id,
            movieTitle: movieData.title,
            moviePoster: movieData.poster,
            movieOverview: movieData.overview,
            realRating: movieData.rating,
            status: "ACTIVE",
          },
        });

        const movie: MoviePayload = {
          id: movieData.id,
          title: movieData.title,
          overview: movieData.overview,
          poster: movieData.poster,
        };

        matchRooms.set(match.id, {
          matchId: match.id,
          player1Id: p1Id,
          player2Id: p2Id,
          movie,
          realRating: movieData.rating,
          ratings: new Map(),
        });

        const [p1, p2] = await Promise.all([
          prisma.user.findUnique({ where: { id: p1Id }, select: { username: true } }),
          prisma.user.findUnique({ where: { id: p2Id }, select: { username: true } }),
        ]);

        const s1 = onlineUsers.get(p1Id);
        const s2 = onlineUsers.get(p2Id);
        if (s1) io.to(s1).emit("match:start", { matchId: match.id, movie, opponentUsername: p2?.username ?? "Avversario" });
        if (s2) io.to(s2).emit("match:start", { matchId: match.id, movie, opponentUsername: p1?.username ?? "Avversario" });
      } catch {
        // Pairing failed — put both users back at the front of the queue
        if (!matchQueue.includes(p1Id)) matchQueue.unshift(p1Id);
        if (!matchQueue.includes(p2Id)) matchQueue.unshift(p2Id);
      }
    });

    socket.on("match:leave_queue", () => {
      removeFromQueue(user.id);
      socket.emit("match:queue_left");
    });

    socket.on("match:submit", async ({ matchId, userRating }) => {
      const room = matchRooms.get(matchId);
      if (!room) return;
      if (room.player1Id !== user.id && room.player2Id !== user.id) return;
      if (room.ratings.has(user.id)) return; // already submitted

      room.ratings.set(user.id, userRating);

      // Notify opponent that this player submitted
      const opponentId = room.player1Id === user.id ? room.player2Id : room.player1Id;
      const opponentSocket = onlineUsers.get(opponentId);
      if (opponentSocket) io.to(opponentSocket).emit("match:opponent_submitted");

      // Both submitted → resolve match
      if (room.ratings.size < 2) return;

      const p1Rating = room.ratings.get(room.player1Id)!;
      const p2Rating = room.ratings.get(room.player2Id)!;
      const real = room.realRating;
      const p1Score = calcScore(Math.abs(p1Rating - real));
      const p2Score = calcScore(Math.abs(p2Rating - real));

      await prisma.match.update({
        where: { id: matchId },
        data: {
          player1Rating: p1Rating,
          player2Rating: p2Rating,
          player1Score: p1Score,
          player2Score: p2Score,
          status: "COMPLETED",
          endedAt: new Date(),
        },
      });

      const [p1, p2] = await Promise.all([
        prisma.user.findUnique({ where: { id: room.player1Id }, select: { username: true } }),
        prisma.user.findUnique({ where: { id: room.player2Id }, select: { username: true } }),
      ]);

      const s1 = onlineUsers.get(room.player1Id);
      const s2 = onlineUsers.get(room.player2Id);

      if (s1) io.to(s1).emit("match:end", {
        matchId,
        realRating: real,
        yourRating: p1Rating,
        yourScore: p1Score,
        opponentUsername: p2?.username ?? "Avversario",
        opponentRating: p2Rating,
        opponentScore: p2Score,
      });
      if (s2) io.to(s2).emit("match:end", {
        matchId,
        realRating: real,
        yourRating: p2Rating,
        yourScore: p2Score,
        opponentUsername: p1?.username ?? "Avversario",
        opponentRating: p1Rating,
        opponentScore: p1Score,
      });

      matchRooms.delete(matchId);
    });

    // ── Chat ─────────────────────────────────────────────────────────────────

    socket.on("chat:send", async ({ content, receiverId }) => {
      if (!content?.trim()) return;

      const message = await prisma.message.create({
        data: {
          senderId: user.id,
          receiverId: receiverId ?? null,
          content: content.trim(),
        },
        include: {
          sender: { select: { id: true, username: true, avatar: true } },
        },
      });

      const payload: MessagePayload = {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        sender: message.sender,
        receiverId: message.receiverId,
      };

      if (receiverId) {
        // Private: deliver to recipient and echo back to sender
        const recipientSocket = onlineUsers.get(receiverId);
        if (recipientSocket) io.to(recipientSocket).emit("chat:message", payload);
        socket.emit("chat:message", payload);
      } else {
        // Global: broadcast to everyone
        io.emit("chat:message", payload);
      }
    });

    socket.on("chat:get_history", async (data) => {
      const receiverId = (data as { receiverId?: number } | undefined)?.receiverId;

      const messages = await prisma.message.findMany({
        where: receiverId
          ? {
              OR: [
                { senderId: user.id, receiverId },
                { senderId: receiverId, receiverId: user.id },
              ],
            }
          : { receiverId: null },
        orderBy: { createdAt: "asc" },
        take: 50,
        include: {
          sender: { select: { id: true, username: true, avatar: true } },
        },
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

    // ── Disconnect ───────────────────────────────────────────────────────────

    socket.on("disconnect", async () => {
      onlineUsers.delete(user.id);
      removeFromQueue(user.id);

      // Cancel any active match this user was in
      for (const [matchId, room] of matchRooms.entries()) {
        if (room.player1Id !== user.id && room.player2Id !== user.id) continue;

        const opponentId = room.player1Id === user.id ? room.player2Id : room.player1Id;
        const opponentSocket = onlineUsers.get(opponentId);
        if (opponentSocket) io.to(opponentSocket).emit("match:opponent_disconnected");

        await prisma.match.update({
          where: { id: matchId },
          data: { status: "CANCELLED", endedAt: new Date() },
        });
        matchRooms.delete(matchId);
      }

      io.emit("users:online", Array.from(onlineUsers.keys()));
    });
  });

  return io;
}
