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
}

interface ClientToServerEvents {
  'match:join_queue': () => void;
  'match:leave_queue': () => void;
  'match:submit': (data: { matchId: number; userRating: number }) => void;
  'chat:send': (data: { content: string; receiverId?: number }) => void;
  'chat:get_history': (data: { receiverId?: number }) => void;
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
