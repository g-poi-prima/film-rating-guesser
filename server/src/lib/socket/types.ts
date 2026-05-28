import type { Server, Socket } from "socket.io";

// ── Shared domain types ───────────────────────────────────────────────────────

export interface UserData {
  id: number;
  username: string;
}

export interface MoviePayload {
  id: number;
  title: string;
  overview: string;
  poster: string | null;
}

// ── Match event payloads ──────────────────────────────────────────────────────

export interface MatchStartPayload {
  matchId: number;
  movie: MoviePayload;
  opponentUsername: string;
  totalRounds: number;
  currentRound: number;
}

export interface MatchRoundResultPayload {
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

export interface MatchRoundStartPayload {
  currentRound: number;
  movie: MoviePayload;
}

export interface MatchEndPayload {
  matchId: number;
  yourTotalScore: number;
  opponentTotalScore: number;
  opponentUsername: string;
}

// ── Chat event payloads ───────────────────────────────────────────────────────

export interface MessagePayload {
  id: number;
  content: string;
  createdAt: Date;
  sender: { id: number; username: string; avatar: string | null };
  receiverId: number | null;
}

// ── Lobby event payloads ──────────────────────────────────────────────────────

export interface LobbyPublicPayload {
  code: string;
  name: string;
  mode: string;
  filmMode: "popular" | "any";
  hostId: number;
  playerCount: number;
  players: { userId: number; username: string; totalScore: number; eliminated: boolean }[];
  status: string;
  currentRound: number;
  totalRounds: number;
}

export interface LobbyRoundStartPayload {
  code: string;
  currentRound: number;
  totalRounds: number;
  movie: MoviePayload;
  activePlayers: number;
  mode: string;
}

export interface LobbyPlayerResult {
  userId: number;
  username: string;
  rating: number;
  roundScore: number;
  totalScore: number;
  eliminated: boolean;
}

export interface LobbyRoundResultPayload {
  code: string;
  roundNumber: number;
  totalRounds: number;
  realRating: number;
  results: LobbyPlayerResult[];
  eliminated: number[];
  isLastRound: boolean;
}

export interface LobbyFinishedPayload {
  code: string;
  results: { userId: number; username: string; totalScore: number; rank: number }[];
}

// ── Socket.io typed server/socket ─────────────────────────────────────────────

export interface ServerToClientEvents {
  "users:online": (users: { id: number; username: string }[]) => void;
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
  "lobby:state": (data: LobbyPublicPayload) => void;
  "lobby:error": (data: { message: string }) => void;
  "lobby:round_start": (data: LobbyRoundStartPayload) => void;
  "lobby:round_result": (data: LobbyRoundResultPayload) => void;
  "lobby:finished": (data: LobbyFinishedPayload) => void;
  "lobby:list": (lobbies: LobbyPublicPayload[]) => void;
}

export interface ClientToServerEvents {
  "match:join_queue": () => void;
  "match:leave_queue": () => void;
  "match:submit": (data: { matchId: number; userRating: number }) => void;
  "chat:send": (data: { content: string; receiverId?: number }) => void;
  "chat:get_history": (data: { receiverId?: number }) => void;
  "lobby:create": (data: { name: string; mode: "ALL_VS_ALL" | "TOURNAMENT"; totalRounds?: number; filmMode?: "popular" | "any" }) => void;
  "lobby:join": (data: { code: string }) => void;
  "lobby:leave": (data: { code: string }) => void;
  "lobby:start": (data: { code: string }) => void;
  "lobby:submit": (data: { code: string; userRating: number }) => void;
  "lobby:list": () => void;
}

export type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  { user: UserData }
>;

export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  { user: UserData }
>;
