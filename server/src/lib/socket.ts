import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import prisma from "./prisma";
import { getEnv } from "@/utils";
import { getRandomMovie } from "./tmdb";
import { lobbies, generateCode, lobbyToPublic } from "./lobbyStore";

const TOTAL_ROUNDS = 5;
const ROUND_TRANSITION_MS = 4000;

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserData { id: number; username: string; }

interface MoviePayload {
  id: number; title: string; overview: string; poster: string | null;
}

interface MatchStartPayload {
  matchId: number; movie: MoviePayload; opponentUsername: string;
  totalRounds: number; currentRound: number;
}
interface MatchRoundResultPayload {
  roundNumber: number; totalRounds: number; realRating: number;
  yourRating: number; yourRoundScore: number; yourTotal: number;
  opponentUsername: string; opponentRating: number; opponentRoundScore: number;
  opponentTotal: number; isLastRound: boolean;
}
interface MatchRoundStartPayload { currentRound: number; movie: MoviePayload; }
interface MatchEndPayload {
  matchId: number; yourTotalScore: number; opponentTotalScore: number; opponentUsername: string;
}
interface MessagePayload {
  id: number; content: string; createdAt: Date;
  sender: { id: number; username: string; avatar: string | null }; receiverId: number | null;
}
interface OnlineUserInfo { id: number; username: string; }

// Lobby payload types
interface LobbyPublic {
  code: string; name: string; mode: string; hostId: number;
  playerCount: number; players: { userId: number; username: string; totalScore: number; eliminated: boolean }[];
  status: string; currentRound: number; totalRounds: number;
}
interface LobbyRoundStartPayload {
  code: string; currentRound: number; totalRounds: number;
  movie: MoviePayload; activePlayers: number; mode: string;
}
interface LobbyPlayerResult {
  userId: number; username: string; rating: number;
  roundScore: number; totalScore: number; eliminated: boolean;
}
interface LobbyRoundResultPayload {
  code: string; roundNumber: number; totalRounds: number; realRating: number;
  results: LobbyPlayerResult[]; eliminated: number[]; isLastRound: boolean;
}
interface LobbyFinishedPayload {
  code: string;
  results: { userId: number; username: string; totalScore: number; rank: number }[];
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
  "lobby:state": (lobby: LobbyPublic) => void;
  "lobby:error": (data: { message: string }) => void;
  "lobby:round_start": (data: LobbyRoundStartPayload) => void;
  "lobby:round_result": (data: LobbyRoundResultPayload) => void;
  "lobby:finished": (data: LobbyFinishedPayload) => void;
  "lobby:list": (lobbies: LobbyPublic[]) => void;
}

interface ClientToServerEvents {
  "match:join_queue": () => void;
  "match:leave_queue": () => void;
  "match:submit": (data: { matchId: number; userRating: number }) => void;
  "chat:send": (data: { content: string; receiverId?: number }) => void;
  "chat:get_history": (data: { receiverId?: number }) => void;
  "lobby:create": (data: { name: string; mode: "ALL_VS_ALL" | "TOURNAMENT"; totalRounds?: number }) => void;
  "lobby:join": (data: { code: string }) => void;
  "lobby:leave": (data: { code: string }) => void;
  "lobby:start": (data: { code: string }) => void;
  "lobby:submit": (data: { code: string; userRating: number }) => void;
  "lobby:list": () => void;
}

// ─── In-memory state ─────────────────────────────────────────────────────────

interface MatchRoom {
  matchId: number; player1Id: number; player2Id: number;
  p1Username: string; p2Username: string;
  totalRounds: number; currentRound: number;
  movie: MoviePayload; realRating: number;
  ratings: Map<number, number>;
  player1TotalScore: number; player2TotalScore: number;
  allRoundsPlayed: boolean;
}

interface OnlineEntry { socketId: string; username: string; }
const onlineUsers = new Map<number, OnlineEntry>();
const matchQueue: number[] = [];
const matchRooms = new Map<number, MatchRoom>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, { user: UserData }>(
    httpServer, { cors: { origin: "*" } }
  );

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Token mancante"));
    try {
      const decoded = jwt.verify(token, getEnv("JWT_SECRET")) as { id: number };
      const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, username: true } });
      if (!user) return next(new Error("Utente non trovato"));
      socket.data.user = user;
      next();
    } catch { next(new Error("Token non valido")); }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    onlineUsers.set(user.id, { socketId: socket.id, username: user.username });
    broadcastOnline(io);

    // ── 1v1 Matchmaking ──────────────────────────────────────────────────────

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
        const movie: MoviePayload = { id: movieData.id, title: movieData.title, overview: movieData.overview, poster: movieData.poster };
        const p1Username = onlineUsers.get(p1Id)?.username ?? "Giocatore";
        const p2Username = onlineUsers.get(p2Id)?.username ?? "Giocatore";
        matchRooms.set(match.id, {
          matchId: match.id, player1Id: p1Id, player2Id: p2Id,
          p1Username, p2Username, totalRounds: TOTAL_ROUNDS, currentRound: 1,
          movie, realRating: movieData.rating, ratings: new Map(),
          player1TotalScore: 0, player2TotalScore: 0, allRoundsPlayed: false,
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

    socket.on("match:leave_queue", () => { removeFromQueue(user.id); socket.emit("match:queue_left"); });

    socket.on("match:submit", async ({ matchId, userRating }) => {
      const room = matchRooms.get(matchId);
      if (!room || (room.player1Id !== user.id && room.player2Id !== user.id)) return;
      if (room.ratings.has(user.id)) return;
      room.ratings.set(user.id, userRating);
      const opponentId = room.player1Id === user.id ? room.player2Id : room.player1Id;
      const oppSocket = onlineUsers.get(opponentId)?.socketId;
      if (oppSocket) io.to(oppSocket).emit("match:opponent_submitted");
      if (room.ratings.size < 2) return;

      const p1Rating = room.ratings.get(room.player1Id)!;
      const p2Rating = room.ratings.get(room.player2Id)!;
      const real = room.realRating;
      const p1Round = calcScore(Math.abs(p1Rating - real));
      const p2Round = calcScore(Math.abs(p2Rating - real));
      room.player1TotalScore += p1Round;
      room.player2TotalScore += p2Round;
      room.ratings = new Map();
      await prisma.matchRound.create({
        data: { matchId, roundNumber: room.currentRound, movieId: room.movie.id, movieTitle: room.movie.title,
          moviePoster: room.movie.poster, movieOverview: room.movie.overview, realRating: real,
          player1Rating: p1Rating, player2Rating: p2Rating, player1Score: p1Round, player2Score: p2Round },
      });
      const isLastRound = room.currentRound >= room.totalRounds;
      if (isLastRound) room.allRoundsPlayed = true;
      const s1 = onlineUsers.get(room.player1Id)?.socketId;
      const s2 = onlineUsers.get(room.player2Id)?.socketId;
      if (s1) io.to(s1).emit("match:round_result", { roundNumber: room.currentRound, totalRounds: room.totalRounds, realRating: real, yourRating: p1Rating, yourRoundScore: p1Round, yourTotal: room.player1TotalScore, opponentUsername: room.p2Username, opponentRating: p2Rating, opponentRoundScore: p2Round, opponentTotal: room.player2TotalScore, isLastRound });
      if (s2) io.to(s2).emit("match:round_result", { roundNumber: room.currentRound, totalRounds: room.totalRounds, realRating: real, yourRating: p2Rating, yourRoundScore: p2Round, yourTotal: room.player2TotalScore, opponentUsername: room.p1Username, opponentRating: p1Rating, opponentRoundScore: p1Round, opponentTotal: room.player1TotalScore, isLastRound });

      if (isLastRound) {
        setTimeout(async () => {
          if (!matchRooms.has(matchId)) return;
          const r = matchRooms.get(matchId)!;
          await prisma.match.update({ where: { id: matchId }, data: { player1Score: r.player1TotalScore, player2Score: r.player2TotalScore, status: "COMPLETED", endedAt: new Date() } });
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
            const next = await getRandomMovie();
            r.movie = { id: next.id, title: next.title, overview: next.overview, poster: next.poster };
            r.realRating = next.rating;
            const ns1 = onlineUsers.get(r.player1Id)?.socketId;
            const ns2 = onlineUsers.get(r.player2Id)?.socketId;
            if (ns1) io.to(ns1).emit("match:round_start", { currentRound: r.currentRound, movie: r.movie });
            if (ns2) io.to(ns2).emit("match:round_start", { currentRound: r.currentRound, movie: r.movie });
          } catch {
            await prisma.match.update({ where: { id: matchId }, data: { player1Score: r.player1TotalScore, player2Score: r.player2TotalScore, status: "COMPLETED", endedAt: new Date() } });
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
      const payload: MessagePayload = { id: message.id, content: message.content, createdAt: message.createdAt, sender: message.sender, receiverId: message.receiverId };
      if (receiverId) {
        const rs = onlineUsers.get(receiverId)?.socketId;
        if (rs) io.to(rs).emit("chat:message", payload);
        socket.emit("chat:message", payload);
      } else {
        io.emit("chat:message", payload);
      }
    });

    socket.on("chat:get_history", async (data) => {
      const receiverId = (data as { receiverId?: number } | undefined)?.receiverId;
      const messages = await prisma.message.findMany({
        where: receiverId ? { OR: [{ senderId: user.id, receiverId }, { senderId: receiverId, receiverId: user.id }] } : { receiverId: null },
        orderBy: { createdAt: "asc" }, take: 50,
        include: { sender: { select: { id: true, username: true, avatar: true } } },
      });
      socket.emit("chat:history", messages.map((m) => ({ id: m.id, content: m.content, createdAt: m.createdAt, sender: m.sender, receiverId: m.receiverId })));
    });

    // ── Custom Lobbies ────────────────────────────────────────────────────────

    socket.on("lobby:list", () => {
      const open = Array.from(lobbies.values())
        .filter((l) => l.status === "WAITING")
        .map(lobbyToPublic);
      socket.emit("lobby:list", open);
    });

    socket.on("lobby:create", async ({ name, mode, totalRounds }) => {
      const code = generateCode();
      const dbMatch = await prisma.customMatch.create({
        data: { code, name, mode, hostId: user.id, totalRounds: totalRounds ?? TOTAL_ROUNDS },
      });
      lobbies.set(code, {
        code, name, mode, hostId: user.id,
        players: new Map([[user.id, { userId: user.id, username: user.username, totalScore: 0, eliminated: false, submittedRating: null }]]),
        status: "WAITING", currentRound: 0, totalRounds: totalRounds ?? TOTAL_ROUNDS,
        movie: null, realRating: 0, dbMatchId: dbMatch.id,
      });
      await socket.join(`lobby:${code}`);
      socket.emit("lobby:state", lobbyToPublic(lobbies.get(code)!));
    });

    socket.on("lobby:join", async ({ code }) => {
      const lobby = lobbies.get(code.toUpperCase());
      if (!lobby) { socket.emit("lobby:error", { message: "Lobby non trovata" }); return; }
      if (lobby.status !== "WAITING") { socket.emit("lobby:error", { message: "La lobby è già iniziata" }); return; }
      if (!lobby.players.has(user.id)) {
        lobby.players.set(user.id, { userId: user.id, username: user.username, totalScore: 0, eliminated: false, submittedRating: null });
        await prisma.customMatch.update({ where: { id: lobby.dbMatchId! }, data: {} }); // just touch to confirm
      }
      await socket.join(`lobby:${code}`);
      io.to(`lobby:${code}`).emit("lobby:state", lobbyToPublic(lobby));
    });

    socket.on("lobby:leave", async ({ code }) => {
      const lobby = lobbies.get(code.toUpperCase());
      if (!lobby) return;
      lobby.players.delete(user.id);
      socket.leave(`lobby:${code}`);
      if (lobby.players.size === 0 || lobby.hostId === user.id) {
        // Dissolve empty lobby or host-left lobby
        await prisma.customMatch.update({ where: { id: lobby.dbMatchId! }, data: { status: "CANCELLED", endedAt: new Date() } });
        lobbies.delete(code);
        io.to(`lobby:${code}`).emit("lobby:error", { message: "La lobby è stata chiusa" });
      } else {
        io.to(`lobby:${code}`).emit("lobby:state", lobbyToPublic(lobby));
      }
    });

    socket.on("lobby:start", async ({ code }) => {
      const lobby = lobbies.get(code.toUpperCase());
      if (!lobby) { socket.emit("lobby:error", { message: "Lobby non trovata" }); return; }
      if (lobby.hostId !== user.id) { socket.emit("lobby:error", { message: "Solo l'host può avviare" }); return; }
      if (lobby.players.size < 2) { socket.emit("lobby:error", { message: "Servono almeno 2 giocatori" }); return; }
      if (lobby.status !== "WAITING") return;

      lobby.status = "IN_PROGRESS";
      lobby.currentRound = 1;
      // Reset scores and elimination state
      for (const p of lobby.players.values()) { p.totalScore = 0; p.eliminated = false; p.submittedRating = null; }

      await prisma.customMatch.update({ where: { id: lobby.dbMatchId! }, data: { status: "ACTIVE" } });

      try {
        const movieData = await getRandomMovie();
        lobby.movie = { id: movieData.id, title: movieData.title, overview: movieData.overview, poster: movieData.poster };
        lobby.realRating = movieData.rating;
        const activePlayers = Array.from(lobby.players.values()).filter((p) => !p.eliminated).length;
        io.to(`lobby:${code}`).emit("lobby:round_start", { code, currentRound: lobby.currentRound, totalRounds: lobby.totalRounds, movie: lobby.movie, activePlayers, mode: lobby.mode });
      } catch {
        socket.emit("lobby:error", { message: "Errore nel recupero del film" });
        lobby.status = "WAITING";
      }
    });

    socket.on("lobby:submit", async ({ code, userRating }) => {
      const lobby = lobbies.get(code.toUpperCase());
      if (!lobby || lobby.status !== "IN_PROGRESS") return;
      const player = lobby.players.get(user.id);
      if (!player || player.eliminated || player.submittedRating !== null) return;

      player.submittedRating = userRating;
      io.to(`lobby:${code}`).emit("lobby:state", lobbyToPublic(lobby));

      // Check if all active non-eliminated players have submitted
      const activePlayers = Array.from(lobby.players.values()).filter((p) => !p.eliminated);
      const allSubmitted = activePlayers.every((p) => p.submittedRating !== null);
      if (!allSubmitted) return;

      // Resolve round
      const real = lobby.realRating;
      const results: LobbyPlayerResult[] = activePlayers.map((p) => {
        const rating = p.submittedRating!;
        const roundScore = calcScore(Math.abs(rating - real));
        p.totalScore += roundScore;
        return { userId: p.userId, username: p.username, rating, roundScore, totalScore: p.totalScore, eliminated: false };
      });
      // Sort by round score desc for display
      results.sort((a, b) => b.roundScore - a.roundScore);

      const isLastRound = lobby.mode === "ALL_VS_ALL"
        ? lobby.currentRound >= lobby.totalRounds
        : activePlayers.length <= 2; // tournament: last round if only 2 players left

      // Tournament elimination
      const eliminatedIds: number[] = [];
      if (lobby.mode === "TOURNAMENT" && activePlayers.length > 1) {
        const sorted = [...results].sort((a, b) => a.roundScore - b.roundScore);
        const elimCount = Math.max(1, Math.floor(activePlayers.length / 2));
        for (let i = 0; i < elimCount; i++) {
          const sortedEntry = sorted[i];
          if (!sortedEntry) break;
          const elim = lobby.players.get(sortedEntry.userId);
          if (!elim) continue;
          elim.eliminated = true;
          const resultEntry = results.find((r) => r.userId === elim.userId);
          if (resultEntry) resultEntry.eliminated = true;
          eliminatedIds.push(elim.userId);
        }
      }

      io.to(`lobby:${code}`).emit("lobby:round_result", {
        code, roundNumber: lobby.currentRound, totalRounds: lobby.totalRounds,
        realRating: real, results, eliminated: eliminatedIds, isLastRound,
      });

      // Reset submissions for next round
      for (const p of lobby.players.values()) p.submittedRating = null;

      const remainingActive = Array.from(lobby.players.values()).filter((p) => !p.eliminated).length;
      const finalCondition = isLastRound || remainingActive <= 1;

      if (finalCondition) {
        setTimeout(async () => {
          if (!lobbies.has(code)) return;
          const lb = lobbies.get(code)!;
          lb.status = "FINISHED";
          const allPlayers = Array.from(lb.players.values()).sort((a, b) => b.totalScore - a.totalScore);
          const finalResults = allPlayers.map((p, i) => ({ userId: p.userId, username: p.username, totalScore: p.totalScore, rank: i + 1 }));
          // Save results to DB
          await Promise.all(finalResults.map((r) =>
            prisma.customMatchResult.create({ data: { customMatchId: lb.dbMatchId!, userId: r.userId, totalScore: r.totalScore, rank: r.rank } })
          ));
          await prisma.customMatch.update({ where: { id: lb.dbMatchId! }, data: { status: "COMPLETED", endedAt: new Date() } });
          io.to(`lobby:${code}`).emit("lobby:finished", { code, results: finalResults });
          lobbies.delete(code);
        }, ROUND_TRANSITION_MS);
      } else {
        lobby.currentRound++;
        setTimeout(async () => {
          if (!lobbies.has(code)) return;
          const lb = lobbies.get(code)!;
          try {
            const nextMovie = await getRandomMovie();
            lb.movie = { id: nextMovie.id, title: nextMovie.title, overview: nextMovie.overview, poster: nextMovie.poster };
            lb.realRating = nextMovie.rating;
            const active = Array.from(lb.players.values()).filter((p) => !p.eliminated).length;
            io.to(`lobby:${code}`).emit("lobby:round_start", { code, currentRound: lb.currentRound, totalRounds: lb.totalRounds, movie: lb.movie, activePlayers: active, mode: lb.mode });
          } catch {
            io.to(`lobby:${code}`).emit("lobby:error", { message: "Errore nel recupero del film" });
          }
        }, ROUND_TRANSITION_MS);
      }
    });

    // ── Disconnect ───────────────────────────────────────────────────────────

    socket.on("disconnect", async () => {
      onlineUsers.delete(user.id);
      removeFromQueue(user.id);

      for (const [matchId, room] of matchRooms.entries()) {
        if (room.player1Id !== user.id && room.player2Id !== user.id) continue;
        const oppId = room.player1Id === user.id ? room.player2Id : room.player1Id;
        const oppSocket = onlineUsers.get(oppId)?.socketId;
        if (oppSocket) io.to(oppSocket).emit("match:opponent_disconnected");
        await prisma.match.update({
          where: { id: matchId },
          data: { player1Score: room.player1TotalScore, player2Score: room.player2TotalScore, status: room.allRoundsPlayed ? "COMPLETED" : "CANCELLED", endedAt: new Date() },
        });
        matchRooms.delete(matchId);
      }

      // Remove from any lobbies
      for (const [code, lobby] of lobbies.entries()) {
        if (!lobby.players.has(user.id)) continue;
        lobby.players.delete(user.id);
        if (lobby.players.size === 0 || (lobby.hostId === user.id && lobby.status === "WAITING")) {
          await prisma.customMatch.update({ where: { id: lobby.dbMatchId! }, data: { status: "CANCELLED", endedAt: new Date() } });
          lobbies.delete(code);
          io.to(`lobby:${code}`).emit("lobby:error", { message: "L'host ha abbandonato la lobby" });
        } else {
          io.to(`lobby:${code}`).emit("lobby:state", lobbyToPublic(lobby));
        }
      }

      broadcastOnline(io);
    });
  });

  return io;
}
