import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import prisma from "./prisma";
import { getEnv } from "@/utils";
import { getRandomMovie } from "./tmdb";

const TOTAL_ROUNDS = 5;
const ROUND_TRANSITION_MS = 4000;

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
  totalRounds: number;
  currentRound: number;
}

interface MatchRoundResultPayload {
  roundNumber: number;
  totalRounds: number;
  realRating: number;
  yourRating: number;
  yourRoundScore: number;
  yourTotal: number;
  opponentUsername: string;
  opponentRating: number;
  opponentRoundScore: number;
  opponentTotal: number;
  isLastRound: boolean;
}

interface MatchRoundStartPayload {
  currentRound: number;
  movie: MoviePayload;
}

interface MatchEndPayload {
  matchId: number;
  yourTotalScore: number;
  opponentTotalScore: number;
  opponentUsername: string;
}

interface MessagePayload {
  id: number;
  content: string;
  createdAt: Date;
  sender: { id: number; username: string; avatar: string | null };
  receiverId: number | null;
}

interface OnlineUserInfo {
  id: number;
  username: string;
}

interface ServerToClientEvents {
  "users:online": (users: OnlineUserInfo[]) => void;
  "match:queue_joined": () => void;
  "match:queue_left": () => void;
  "match:start": (data: MatchStartPayload) => void;
  "match:opponent_submitted": () => void;
  "match:round_result": (data: MatchRoundResultPayload) => void;
  "match:round_start": (data: MatchRoundStartPayload) => void;
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
  p1Username: string;
  p2Username: string;
  totalRounds: number;
  currentRound: number;
  movie: MoviePayload;
  realRating: number;
  ratings: Map<number, number>;
  player1TotalScore: number;
  player2TotalScore: number;
  allRoundsPlayed: boolean;
}

interface OnlineEntry { socketId: string; username: string; }
const onlineUsers = new Map<number, OnlineEntry>();
const matchQueue: number[] = [];
const matchRooms = new Map<number, MatchRoom>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Exponential decay: precise guesses score well, errors are penalised steeply.
// diff=0 → 100, diff=0.5 → 55, diff=1 → 30, diff=2 → 9, diff=3 → 3
function calcScore(diff: number): number {
  return Math.max(0, Math.round(100 * Math.exp(-diff * 1.2)));
}

function removeFromQueue(userId: number) {
  const idx = matchQueue.indexOf(userId);
  if (idx !== -1) matchQueue.splice(idx, 1);
}

function broadcastOnline(io: Server) {
  io.emit("users:online", Array.from(onlineUsers.entries()).map(([id, e]) => ({ id, username: e.username })));
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
    onlineUsers.set(user.id, { socketId: socket.id, username: user.username });
    broadcastOnline(io);

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
          data: { player1Id: p1Id, player2Id: p2Id, totalRounds: TOTAL_ROUNDS, status: "ACTIVE" },
        });

        const movie: MoviePayload = {
          id: movieData.id,
          title: movieData.title,
          overview: movieData.overview,
          poster: movieData.poster,
        };

        const p1Username = onlineUsers.get(p1Id)?.username ?? "Giocatore";
        const p2Username = onlineUsers.get(p2Id)?.username ?? "Giocatore";

        matchRooms.set(match.id, {
          matchId: match.id,
          player1Id: p1Id,
          player2Id: p2Id,
          p1Username,
          p2Username,
          totalRounds: TOTAL_ROUNDS,
          currentRound: 1,
          movie,
          realRating: movieData.rating,
          ratings: new Map(),
          player1TotalScore: 0,
          player2TotalScore: 0,
          allRoundsPlayed: false,
        });

        const s1 = onlineUsers.get(p1Id)?.socketId;
        const s2 = onlineUsers.get(p2Id)?.socketId;
        if (s1) io.to(s1).emit("match:start", { matchId: match.id, movie, opponentUsername: p2Username, totalRounds: TOTAL_ROUNDS, currentRound: 1 });
        if (s2) io.to(s2).emit("match:start", { matchId: match.id, movie, opponentUsername: p1Username, totalRounds: TOTAL_ROUNDS, currentRound: 1 });
      } catch {
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
      if (room.ratings.has(user.id)) return;

      room.ratings.set(user.id, userRating);

      const opponentId = room.player1Id === user.id ? room.player2Id : room.player1Id;
      const opponentSocket = onlineUsers.get(opponentId)?.socketId;
      if (opponentSocket) io.to(opponentSocket).emit("match:opponent_submitted");

      if (room.ratings.size < 2) return;

      // ── Both submitted: resolve this round ───────────────────────────────

      const p1Rating = room.ratings.get(room.player1Id)!;
      const p2Rating = room.ratings.get(room.player2Id)!;
      const real = room.realRating;
      const p1RoundScore = calcScore(Math.abs(p1Rating - real));
      const p2RoundScore = calcScore(Math.abs(p2Rating - real));

      room.player1TotalScore += p1RoundScore;
      room.player2TotalScore += p2RoundScore;
      room.ratings = new Map();

      await prisma.matchRound.create({
        data: {
          matchId,
          roundNumber: room.currentRound,
          movieId: room.movie.id,
          movieTitle: room.movie.title,
          moviePoster: room.movie.poster,
          movieOverview: room.movie.overview,
          realRating: real,
          player1Rating: p1Rating,
          player2Rating: p2Rating,
          player1Score: p1RoundScore,
          player2Score: p2RoundScore,
        },
      });

      const isLastRound = room.currentRound >= room.totalRounds;
      if (isLastRound) room.allRoundsPlayed = true;

      const s1 = onlineUsers.get(room.player1Id)?.socketId;
      const s2 = onlineUsers.get(room.player2Id)?.socketId;

      if (s1) io.to(s1).emit("match:round_result", {
        roundNumber: room.currentRound, totalRounds: room.totalRounds,
        realRating: real, yourRating: p1Rating, yourRoundScore: p1RoundScore, yourTotal: room.player1TotalScore,
        opponentUsername: room.p2Username, opponentRating: p2Rating, opponentRoundScore: p2RoundScore, opponentTotal: room.player2TotalScore,
        isLastRound,
      });
      if (s2) io.to(s2).emit("match:round_result", {
        roundNumber: room.currentRound, totalRounds: room.totalRounds,
        realRating: real, yourRating: p2Rating, yourRoundScore: p2RoundScore, yourTotal: room.player2TotalScore,
        opponentUsername: room.p1Username, opponentRating: p1Rating, opponentRoundScore: p1RoundScore, opponentTotal: room.player1TotalScore,
        isLastRound,
      });

      if (isLastRound) {
        setTimeout(async () => {
          if (!matchRooms.has(matchId)) return;
          const r = matchRooms.get(matchId)!;
          await prisma.match.update({
            where: { id: matchId },
            data: { player1Score: r.player1TotalScore, player2Score: r.player2TotalScore, status: "COMPLETED", endedAt: new Date() },
          });
          const fs1 = onlineUsers.get(r.player1Id)?.socketId;
          const fs2 = onlineUsers.get(r.player2Id)?.socketId;
          if (fs1) io.to(fs1).emit("match:end", { matchId, yourTotalScore: r.player1TotalScore, opponentTotalScore: r.player2TotalScore, opponentUsername: r.p2Username });
          if (fs2) io.to(fs2).emit("match:end", { matchId, yourTotalScore: r.player2TotalScore, opponentTotalScore: r.player1TotalScore, opponentUsername: r.p1Username });
          matchRooms.delete(matchId);
        }, ROUND_TRANSITION_MS);
      } else {
        room.currentRound++;
        setTimeout(async () => {
          if (!matchRooms.has(matchId)) return;
          const r = matchRooms.get(matchId)!;
          try {
            const nextMovie = await getRandomMovie();
            r.movie = { id: nextMovie.id, title: nextMovie.title, overview: nextMovie.overview, poster: nextMovie.poster };
            r.realRating = nextMovie.rating;
            const ns1 = onlineUsers.get(r.player1Id)?.socketId;
            const ns2 = onlineUsers.get(r.player2Id)?.socketId;
            if (ns1) io.to(ns1).emit("match:round_start", { currentRound: r.currentRound, movie: r.movie });
            if (ns2) io.to(ns2).emit("match:round_start", { currentRound: r.currentRound, movie: r.movie });
          } catch {
            await prisma.match.update({
              where: { id: matchId },
              data: { player1Score: r.player1TotalScore, player2Score: r.player2TotalScore, status: "COMPLETED", endedAt: new Date() },
            });
            const es1 = onlineUsers.get(r.player1Id)?.socketId;
            const es2 = onlineUsers.get(r.player2Id)?.socketId;
            if (es1) io.to(es1).emit("match:end", { matchId, yourTotalScore: r.player1TotalScore, opponentTotalScore: r.player2TotalScore, opponentUsername: r.p2Username });
            if (es2) io.to(es2).emit("match:end", { matchId, yourTotalScore: r.player2TotalScore, opponentTotalScore: r.player1TotalScore, opponentUsername: r.p1Username });
            matchRooms.delete(matchId);
          }
        }, ROUND_TRANSITION_MS);
      }
    });

    // ── Chat ─────────────────────────────────────────────────────────────────

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
        const recipientSocket = onlineUsers.get(receiverId)?.socketId;
        if (recipientSocket) io.to(recipientSocket).emit("chat:message", payload);
        socket.emit("chat:message", payload);
      } else {
        io.emit("chat:message", payload);
      }
    });

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

      socket.emit("chat:history", messages.map((m) => ({
        id: m.id, content: m.content, createdAt: m.createdAt, sender: m.sender, receiverId: m.receiverId,
      })));
    });

    // ── Disconnect ───────────────────────────────────────────────────────────

    socket.on("disconnect", async () => {
      onlineUsers.delete(user.id);
      removeFromQueue(user.id);

      for (const [matchId, room] of matchRooms.entries()) {
        if (room.player1Id !== user.id && room.player2Id !== user.id) continue;

        const opponentId = room.player1Id === user.id ? room.player2Id : room.player1Id;
        const opponentSocket = onlineUsers.get(opponentId)?.socketId;
        if (opponentSocket) io.to(opponentSocket).emit("match:opponent_disconnected");

        if (room.allRoundsPlayed) {
          await prisma.match.update({
            where: { id: matchId },
            data: { player1Score: room.player1TotalScore, player2Score: room.player2TotalScore, status: "COMPLETED", endedAt: new Date() },
          });
        } else {
          await prisma.match.update({
            where: { id: matchId },
            data: { player1Score: room.player1TotalScore, player2Score: room.player2TotalScore, status: "CANCELLED", endedAt: new Date() },
          });
        }
        matchRooms.delete(matchId);
      }

      broadcastOnline(io);
    });
  });

  return io;
}
