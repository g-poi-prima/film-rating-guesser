import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

// ── Payload types (mirror server) ────────────────────────────────────────────

export interface OnlineUser {
  id: number;
  username: string;
}

export interface MatchStartPayload {
  matchId: number;
  movie: { id: number; title: string; overview: string; poster: string | null };
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
  movie: { id: number; title: string; overview: string; poster: string | null };
}

export interface MatchEndPayload {
  matchId: number;
  yourTotalScore: number;
  opponentTotalScore: number;
  opponentUsername: string;
}

export interface MessagePayload {
  id: number;
  content: string;
  createdAt: string;
  sender: { id: number; username: string; avatar: string | null };
  receiverId: number | null;
}

// ── Lobby payload types ───────────────────────────────────────────────────────

export interface LobbyPlayerState {
  userId: number;
  username: string;
  totalScore: number;
  eliminated: boolean;
}

export interface LobbyStatePayload {
  code: string;
  name: string;
  mode: 'ALL_VS_ALL' | 'TOURNAMENT';
  filmMode: 'popular' | 'any';
  hostId: number;
  playerCount: number;
  players: LobbyPlayerState[];
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
  currentRound: number;
  totalRounds: number;
  chatMessages: LobbyChatMessage[];
}

export interface LobbyRoundStartPayload {
  code: string;
  currentRound: number;
  totalRounds: number;
  movie: { id: number; title: string; overview: string; poster: string | null };
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

export interface LobbyChatMessage {
  id: string;
  userId: number;
  username: string;
  text: string;
  createdAt: string;
}

// ── Socket types ──────────────────────────────────────────────────────────────

interface ServerToClientEvents {
  'users:online': (users: OnlineUser[]) => void;
  'match:queue_joined': () => void;
  'match:queue_left': () => void;
  'match:start': (data: MatchStartPayload) => void;
  'match:opponent_submitted': () => void;
  'match:round_result': (data: MatchRoundResultPayload) => void;
  'match:round_start': (data: MatchRoundStartPayload) => void;
  'match:end': (data: MatchEndPayload) => void;
  'match:opponent_disconnected': () => void;
  'chat:message': (msg: MessagePayload) => void;
  'chat:history': (msgs: MessagePayload[]) => void;
  'lobby:state': (data: LobbyStatePayload) => void;
  'lobby:error': (data: { message: string }) => void;
  'lobby:round_start': (data: LobbyRoundStartPayload) => void;
  'lobby:round_result': (data: LobbyRoundResultPayload) => void;
  'lobby:finished': (data: LobbyFinishedPayload) => void;
  'lobby:list': (lobbies: LobbyStatePayload[]) => void;
  'lobby:chat': (msg: LobbyChatMessage) => void;
  'friend:update': () => void;
}

interface ClientToServerEvents {
  'match:join_queue': () => void;
  'match:leave_queue': () => void;
  'match:submit': (data: { matchId: number; userRating: number }) => void;
  'chat:send': (data: { content: string; receiverId?: number }) => void;
  'chat:get_history': (data: { receiverId?: number }) => void;
  'lobby:create': (data: { name: string; mode: 'ALL_VS_ALL' | 'TOURNAMENT'; totalRounds?: number; filmMode?: 'popular' | 'any' }) => void;
  'lobby:join': (data: { code: string }) => void;
  'lobby:leave': (data: { code: string }) => void;
  'lobby:start': (data: { code: string }) => void;
  'lobby:submit': (data: { code: string; userRating: number }) => void;
  'lobby:list': () => void;
  'lobby:chat': (data: { code: string; text: string }) => void;
  'lobby:restart': (data: { code: string }) => void;
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// ── Context ───────────────────────────────────────────────────────────────────

interface SocketContextType {
  socket: AppSocket | null;
  onlineUsers: OnlineUser[];
}

const SocketContext = createContext<SocketContextType>({ socket: null, onlineUsers: [] });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<AppSocket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const s = io('/', { auth: { token } }) as AppSocket;
    s.on('users:online', setOnlineUsers);
    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
      setOnlineUsers([]);
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
