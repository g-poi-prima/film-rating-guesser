import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { getRandomMovie } from "@/lib/tmdb";
import type { FilmMode } from "@/lib/lobbyStore";
import { calcScore } from "@/lib/scoring";
import { TOTAL_ROUNDS, ROUND_TRANSITION_MS } from "@/constants";
import { lobbies, generateCode, lobbyToPublic } from "@/lib/lobbyStore";
import type { AppServer, AppSocket, UserData, LobbyPlayerResult } from "../types";

export function registerLobbyHandlers(
  io: AppServer,
  socket: AppSocket,
  user: UserData
): void {
  // ── List open lobbies ───────────────────────────────────────────────────────

  socket.on("lobby:list", () => {
    const open = Array.from(lobbies.values())
      .filter((l) => l.status === "WAITING")
      .map(lobbyToPublic);
    socket.emit("lobby:list", open);
  });

  // ── Create lobby ────────────────────────────────────────────────────────────

  socket.on("lobby:create", async ({ name, mode, totalRounds, filmMode }) => {
    const code = generateCode();
    const rounds = totalRounds ?? TOTAL_ROUNDS;
    const resolvedFilmMode: FilmMode = filmMode === "any" ? "any" : "popular";

    const dbMatch = await prisma.customMatch.create({
      data: { code, name, mode, hostId: user.id, totalRounds: rounds },
    });

    lobbies.set(code, {
      code,
      name,
      mode,
      filmMode: resolvedFilmMode,
      hostId: user.id,
      players: new Map([
        [user.id, { userId: user.id, username: user.username, totalScore: 0, eliminated: false, submittedRating: null }],
      ]),
      status: "WAITING",
      currentRound: 0,
      totalRounds: rounds,
      movie: null,
      realRating: 0,
      dbMatchId: dbMatch.id,
      chatMessages: [],
    });

    await socket.join(`lobby:${code}`);
    socket.emit("lobby:state", lobbyToPublic(lobbies.get(code)!));
  });

  // ── Join lobby ──────────────────────────────────────────────────────────────

  socket.on("lobby:join", async ({ code }) => {
    const key = code.toUpperCase();
    const lobby = lobbies.get(key);

    if (!lobby) {
      socket.emit("lobby:error", { message: "Lobby non trovata" });
      return;
    }
    if (lobby.status !== "WAITING") {
      socket.emit("lobby:error", { message: "La lobby è già iniziata" });
      return;
    }

    if (!lobby.players.has(user.id)) {
      lobby.players.set(user.id, {
        userId: user.id,
        username: user.username,
        totalScore: 0,
        eliminated: false,
        submittedRating: null,
      });
    }

    await socket.join(`lobby:${key}`);
    io.to(`lobby:${key}`).emit("lobby:state", lobbyToPublic(lobby));
  });

  // ── Leave lobby ─────────────────────────────────────────────────────────────

  socket.on("lobby:leave", async ({ code }) => {
    const key = code.toUpperCase();
    await leaveLobby(io, socket, user.id, key);
  });

  // ── Start game ──────────────────────────────────────────────────────────────

  socket.on("lobby:start", async ({ code }) => {
    const key = code.toUpperCase();
    const lobby = lobbies.get(key);

    if (!lobby) { socket.emit("lobby:error", { message: "Lobby non trovata" }); return; }
    if (lobby.hostId !== user.id) { socket.emit("lobby:error", { message: "Solo l'host può avviare" }); return; }
    if (lobby.players.size < 2) { socket.emit("lobby:error", { message: "Servono almeno 2 giocatori" }); return; }
    if (lobby.status !== "WAITING") return;

    lobby.status = "IN_PROGRESS";
    lobby.currentRound = 1;

    for (const p of lobby.players.values()) {
      p.totalScore = 0;
      p.eliminated = false;
      p.submittedRating = null;
    }

    await prisma.customMatch.update({ where: { id: lobby.dbMatchId! }, data: { status: "ACTIVE" } });

    try {
      const movieData = await getRandomMovie(lobby.filmMode);
      lobby.movie = { id: movieData.id, title: movieData.title, overview: movieData.overview, poster: movieData.poster };
      lobby.realRating = movieData.rating;

      const activePlayers = countActivePlayers(key);
      io.to(`lobby:${key}`).emit("lobby:round_start", {
        code: key, currentRound: lobby.currentRound, totalRounds: lobby.totalRounds,
        movie: lobby.movie, activePlayers, mode: lobby.mode,
      });
    } catch {
      lobby.status = "WAITING";
      socket.emit("lobby:error", { message: "Errore nel recupero del film" });
    }
  });

  // ── Chat ────────────────────────────────────────────────────────────────────

  socket.on("lobby:chat", ({ code, text }) => {
    const key = code.toUpperCase();
    const lobby = lobbies.get(key);
    if (!lobby || !text?.trim()) return;

    const msg = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: user.username,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    lobby.chatMessages.push(msg);
    io.to(`lobby:${key}`).emit("lobby:chat", msg);
  });

  // ── Submit rating ───────────────────────────────────────────────────────────

  socket.on("lobby:submit", async ({ code, userRating }) => {
    const key = code.toUpperCase();
    const lobby = lobbies.get(key);
    if (!lobby || lobby.status !== "IN_PROGRESS") return;

    const player = lobby.players.get(user.id);
    if (!player || player.eliminated || player.submittedRating !== null) return;

    player.submittedRating = userRating;
    io.to(`lobby:${key}`).emit("lobby:state", lobbyToPublic(lobby));

    // Wait for all active players to submit
    const activePlayers = Array.from(lobby.players.values()).filter((p) => !p.eliminated);
    if (!activePlayers.every((p) => p.submittedRating !== null)) return;

    // ── Resolve round ─────────────────────────────────────────────────────────
    const real = lobby.realRating;
    const results: LobbyPlayerResult[] = activePlayers.map((p) => {
      const rating = p.submittedRating!;
      const roundScore = calcScore(Math.abs(rating - real));
      p.totalScore += roundScore;
      return { userId: p.userId, username: p.username, rating, roundScore, totalScore: p.totalScore, eliminated: false };
    });
    results.sort((a, b) => b.roundScore - a.roundScore);

    const isLastRound =
      lobby.mode === "ALL_VS_ALL"
        ? lobby.currentRound >= lobby.totalRounds
        : activePlayers.length <= 2;

    // Tournament elimination
    const eliminatedIds: number[] = [];
    if (lobby.mode === "TOURNAMENT" && activePlayers.length > 1) {
      const sorted = [...results].sort((a, b) => a.roundScore - b.roundScore);
      const elimCount = Math.max(1, Math.floor(activePlayers.length / 2));
      for (let i = 0; i < elimCount; i++) {
        const entry = sorted[i];
        if (!entry) break;
        const elim = lobby.players.get(entry.userId);
        if (!elim) continue;
        elim.eliminated = true;
        const resultEntry = results.find((r) => r.userId === elim.userId);
        if (resultEntry) resultEntry.eliminated = true;
        eliminatedIds.push(elim.userId);
      }
    }

    io.to(`lobby:${key}`).emit("lobby:round_result", {
      code: key, roundNumber: lobby.currentRound, totalRounds: lobby.totalRounds,
      realRating: real, results, eliminated: eliminatedIds, isLastRound,
    });

    // Reset submissions for the next round
    for (const p of lobby.players.values()) p.submittedRating = null;

    const remaining = Array.from(lobby.players.values()).filter((p) => !p.eliminated).length;
    const isFinal = isLastRound || remaining <= 1;

    if (isFinal) {
      await finishLobby(io, key);
    } else {
      lobby.currentRound++;
      await advanceLobbyRound(io, key);
    }
  });
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function countActivePlayers(code: string): number {
  return Array.from(lobbies.get(code)?.players.values() ?? []).filter((p) => !p.eliminated).length;
}

async function finishLobby(io: AppServer, code: string): Promise<void> {
  await sleep(ROUND_TRANSITION_MS);
  const lobby = lobbies.get(code);
  if (!lobby) return;

  lobby.status = "FINISHED";

  const sorted = Array.from(lobby.players.values()).sort((a, b) => b.totalScore - a.totalScore);
  const finalResults = sorted.map((p, i) => ({
    userId: p.userId,
    username: p.username,
    totalScore: p.totalScore,
    rank: i + 1,
  }));

  await Promise.all(
    finalResults.map((r) =>
      prisma.customMatchResult.create({
        data: { customMatchId: lobby.dbMatchId!, userId: r.userId, totalScore: r.totalScore, rank: r.rank },
      })
    )
  );
  await prisma.customMatch.update({
    where: { id: lobby.dbMatchId! },
    data: { status: "COMPLETED", endedAt: new Date() },
  });

  io.to(`lobby:${code}`).emit("lobby:finished", { code, results: finalResults });
  lobbies.delete(code);
}

async function advanceLobbyRound(io: AppServer, code: string): Promise<void> {
  await sleep(ROUND_TRANSITION_MS);
  const lobby = lobbies.get(code);
  if (!lobby) return;

  try {
    const next = await getRandomMovie(lobby.filmMode);
    lobby.movie = { id: next.id, title: next.title, overview: next.overview, poster: next.poster };
    lobby.realRating = next.rating;

    const active = countActivePlayers(code);
    io.to(`lobby:${code}`).emit("lobby:round_start", {
      code, currentRound: lobby.currentRound, totalRounds: lobby.totalRounds,
      movie: lobby.movie, activePlayers: active, mode: lobby.mode,
    });
  } catch {
    io.to(`lobby:${code}`).emit("lobby:error", { message: "Errore nel recupero del film" });
  }
}

async function leaveLobby(
  io: AppServer,
  socket: AppSocket,
  userId: number,
  code: string
): Promise<void> {
  const lobby = lobbies.get(code);
  if (!lobby) return;

  lobby.players.delete(userId);
  socket.leave(`lobby:${code}`);

  if (lobby.players.size === 0 || lobby.hostId === userId) {
    await prisma.customMatch.update({
      where: { id: lobby.dbMatchId! },
      data: { status: "CANCELLED", endedAt: new Date() },
    });
    lobbies.delete(code);
    io.to(`lobby:${code}`).emit("lobby:error", { message: "La lobby è stata chiusa" });
  } else {
    io.to(`lobby:${code}`).emit("lobby:state", lobbyToPublic(lobby));
  }
}

/** Handle disconnect: remove user from any lobbies they were in. */
export async function handleLobbyDisconnect(io: AppServer, userId: number): Promise<void> {
  for (const [code, lobby] of lobbies.entries()) {
    if (!lobby.players.has(userId)) continue;

    lobby.players.delete(userId);

    if (lobby.players.size === 0 || (lobby.hostId === userId && lobby.status === "WAITING")) {
      await prisma.customMatch.update({
        where: { id: lobby.dbMatchId! },
        data: { status: "CANCELLED", endedAt: new Date() },
      });
      lobbies.delete(code);
      io.to(`lobby:${code}`).emit("lobby:error", { message: "L'host ha abbandonato la lobby" });
    } else {
      io.to(`lobby:${code}`).emit("lobby:state", lobbyToPublic(lobby));
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
