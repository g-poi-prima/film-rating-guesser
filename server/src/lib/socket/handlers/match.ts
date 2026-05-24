import prisma from "@/lib/prisma";
import { getRandomMovie } from "@/lib/tmdb";
// Competitive 1v1 always uses popular mode so both players recognise the films
import { calcScore } from "@/lib/scoring";
import { TOTAL_ROUNDS, ROUND_TRANSITION_MS } from "@/constants";
import {
  onlineUsers,
  matchQueue,
  matchRooms,
  removeFromQueue,
  type MatchRoom,
} from "../store";
import type { AppServer, AppSocket, UserData, MoviePayload } from "../types";

export function registerMatchHandlers(
  io: AppServer,
  socket: AppSocket,
  user: UserData
): void {
  // ── Join queue ──────────────────────────────────────────────────────────────

  socket.on("match:join_queue", async () => {
    if (matchQueue.includes(user.id)) return;
    matchQueue.push(user.id);
    socket.emit("match:queue_joined");

    if (matchQueue.length < 2) return;

    const p1Id = matchQueue.shift()!;
    const p2Id = matchQueue.shift()!;

    try {
      const movieData = await getRandomMovie("popular");
      const movie: MoviePayload = {
        id: movieData.id,
        title: movieData.title,
        overview: movieData.overview,
        poster: movieData.poster,
      };

      const match = await prisma.match.create({
        data: { player1Id: p1Id, player2Id: p2Id, totalRounds: TOTAL_ROUNDS, status: "ACTIVE" },
      });

      const p1Username = onlineUsers.get(p1Id)?.username ?? "Giocatore 1";
      const p2Username = onlineUsers.get(p2Id)?.username ?? "Giocatore 2";

      const room: MatchRoom = {
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
      };
      matchRooms.set(match.id, room);

      const s1 = onlineUsers.get(p1Id)?.socketId;
      const s2 = onlineUsers.get(p2Id)?.socketId;
      if (s1) io.to(s1).emit("match:start", { matchId: match.id, movie, opponentUsername: p2Username, totalRounds: TOTAL_ROUNDS, currentRound: 1 });
      if (s2) io.to(s2).emit("match:start", { matchId: match.id, movie, opponentUsername: p1Username, totalRounds: TOTAL_ROUNDS, currentRound: 1 });
    } catch {
      // Return players to front of queue on failure
      if (!matchQueue.includes(p1Id)) matchQueue.unshift(p1Id);
      if (!matchQueue.includes(p2Id)) matchQueue.unshift(p2Id);
    }
  });

  // ── Leave queue ─────────────────────────────────────────────────────────────

  socket.on("match:leave_queue", () => {
    removeFromQueue(user.id);
    socket.emit("match:queue_left");
  });

  // ── Submit rating ───────────────────────────────────────────────────────────

  socket.on("match:submit", async ({ matchId, userRating }) => {
    const room = matchRooms.get(matchId);
    if (!room) return;
    if (room.player1Id !== user.id && room.player2Id !== user.id) return;
    if (room.ratings.has(user.id)) return; // already submitted this round

    room.ratings.set(user.id, userRating);

    // Notify the opponent that this player has submitted
    const opponentId = room.player1Id === user.id ? room.player2Id : room.player1Id;
    const oppSocketId = onlineUsers.get(opponentId)?.socketId;
    if (oppSocketId) io.to(oppSocketId).emit("match:opponent_submitted");

    // Wait for both players
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
        player1Score: p1Round,
        player2Score: p2Round,
      },
    });

    const isLastRound = room.currentRound >= room.totalRounds;
    if (isLastRound) room.allRoundsPlayed = true;

    const s1 = onlineUsers.get(room.player1Id)?.socketId;
    const s2 = onlineUsers.get(room.player2Id)?.socketId;

    if (s1) io.to(s1).emit("match:round_result", {
      roundNumber: room.currentRound, totalRounds: room.totalRounds, realRating: real,
      yourRating: p1Rating, yourRoundScore: p1Round, yourTotal: room.player1TotalScore,
      opponentUsername: room.p2Username, opponentRating: p2Rating,
      opponentRoundScore: p2Round, opponentTotal: room.player2TotalScore, isLastRound,
    });
    if (s2) io.to(s2).emit("match:round_result", {
      roundNumber: room.currentRound, totalRounds: room.totalRounds, realRating: real,
      yourRating: p2Rating, yourRoundScore: p2Round, yourTotal: room.player2TotalScore,
      opponentUsername: room.p1Username, opponentRating: p1Rating,
      opponentRoundScore: p1Round, opponentTotal: room.player1TotalScore, isLastRound,
    });

    if (isLastRound) {
      await finishMatch(io, matchId);
    } else {
      room.currentRound++;
      await advanceRound(io, matchId);
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function finishMatch(io: AppServer, matchId: number): Promise<void> {
  await sleep(ROUND_TRANSITION_MS);
  const room = matchRooms.get(matchId);
  if (!room) return;

  await prisma.match.update({
    where: { id: matchId },
    data: {
      player1Score: room.player1TotalScore,
      player2Score: room.player2TotalScore,
      status: "COMPLETED",
      endedAt: new Date(),
    },
  });

  const s1 = onlineUsers.get(room.player1Id)?.socketId;
  const s2 = onlineUsers.get(room.player2Id)?.socketId;
  if (s1) io.to(s1).emit("match:end", { matchId, yourTotalScore: room.player1TotalScore, opponentTotalScore: room.player2TotalScore, opponentUsername: room.p2Username });
  if (s2) io.to(s2).emit("match:end", { matchId, yourTotalScore: room.player2TotalScore, opponentTotalScore: room.player1TotalScore, opponentUsername: room.p1Username });

  matchRooms.delete(matchId);
}

async function advanceRound(io: AppServer, matchId: number): Promise<void> {
  await sleep(ROUND_TRANSITION_MS);
  const room = matchRooms.get(matchId);
  if (!room) return;

  try {
    const next = await getRandomMovie("popular");
    room.movie = { id: next.id, title: next.title, overview: next.overview, poster: next.poster };
    room.realRating = next.rating;

    const s1 = onlineUsers.get(room.player1Id)?.socketId;
    const s2 = onlineUsers.get(room.player2Id)?.socketId;
    if (s1) io.to(s1).emit("match:round_start", { currentRound: room.currentRound, movie: room.movie });
    if (s2) io.to(s2).emit("match:round_start", { currentRound: room.currentRound, movie: room.movie });
  } catch {
    // TMDB failed — gracefully end the match with current scores
    await finishMatch(io, matchId);
  }
}

/** Handle disconnect for a player: clean up any match they're part of. */
export async function handleMatchDisconnect(io: AppServer, userId: number): Promise<void> {
  for (const [matchId, room] of matchRooms.entries()) {
    if (room.player1Id !== userId && room.player2Id !== userId) continue;

    const opponentId = room.player1Id === userId ? room.player2Id : room.player1Id;
    const oppSocketId = onlineUsers.get(opponentId)?.socketId;
    if (oppSocketId) io.to(oppSocketId).emit("match:opponent_disconnected");

    await prisma.match.update({
      where: { id: matchId },
      data: {
        player1Score: room.player1TotalScore,
        player2Score: room.player2TotalScore,
        status: room.allRoundsPlayed ? "COMPLETED" : "CANCELLED",
        endedAt: new Date(),
      },
    });

    matchRooms.delete(matchId);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
