import type { AppServer, MoviePayload } from "./types";

// ── Online users ──────────────────────────────────────────────────────────────

export interface OnlineEntry {
  socketId: string;
  username: string;
}

export const onlineUsers = new Map<number, OnlineEntry>();

export function broadcastOnline(io: AppServer): void {
  io.emit(
    "users:online",
    Array.from(onlineUsers.entries()).map(([id, e]) => ({ id, username: e.username }))
  );
}

// ── Matchmaking queue ─────────────────────────────────────────────────────────

export const matchQueue: number[] = [];

export function removeFromQueue(userId: number): void {
  const idx = matchQueue.indexOf(userId);
  if (idx !== -1) matchQueue.splice(idx, 1);
}

// ── Active 1v1 rooms ──────────────────────────────────────────────────────────

export interface MatchRoom {
  matchId: number;
  player1Id: number;
  player2Id: number;
  p1Username: string;
  p2Username: string;
  totalRounds: number;
  currentRound: number;
  movie: MoviePayload;
  realRating: number;
  /** Ratings submitted in the current round; cleared after each round resolves. */
  ratings: Map<number, number>;
  player1TotalScore: number;
  player2TotalScore: number;
  /** Set true after the last round so a disconnect marks the match COMPLETED. */
  allRoundsPlayed: boolean;
}

export const matchRooms = new Map<number, MatchRoom>();
