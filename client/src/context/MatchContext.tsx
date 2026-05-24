import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useSocket } from './SocketContext';
import type { MatchStartPayload, MatchRoundResultPayload, MatchEndPayload } from './SocketContext';

export type MatchPhase = 'idle' | 'queuing' | 'playing' | 'submitted' | 'round_result' | 'result' | 'disconnected';

export interface ActiveMatch {
  matchId: number;
  movie: MatchStartPayload['movie'];
  opponentUsername: string;
  totalRounds: number;
  currentRound: number;
}

export interface RoundSummary {
  roundNumber: number;
  movieTitle: string;
  realRating: number;
  yourRating: number;
  yourRoundScore: number;
  opponentRating: number;
  opponentRoundScore: number;
}

interface MatchContextType {
  phase: MatchPhase;
  activeMatch: ActiveMatch | null;
  roundResult: MatchRoundResultPayload | null;
  rounds: RoundSummary[];
  finalResult: MatchEndPayload | null;
  countdown: number;
  joinQueue: () => void;
  leaveQueue: () => void;
  submitRating: (rating: number) => void;
  reset: () => void;
}

const MatchContext = createContext<MatchContextType>({
  phase: 'idle', activeMatch: null, roundResult: null, rounds: [], finalResult: null, countdown: 4,
  joinQueue: () => {}, leaveQueue: () => {}, submitRating: () => {}, reset: () => {},
});

export function MatchProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const [phase, setPhase] = useState<MatchPhase>('idle');
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const [roundResult, setRoundResult] = useState<MatchRoundResultPayload | null>(null);
  const [rounds, setRounds] = useState<RoundSummary[]>([]);
  const [finalResult, setFinalResult] = useState<MatchEndPayload | null>(null);
  const [countdown, setCountdown] = useState(4);

  // Countdown timer while showing round result
  useEffect(() => {
    if (phase !== 'round_result') return;
    setCountdown(4);
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (!socket) return;

    socket.on('match:queue_joined', () => setPhase('queuing'));
    socket.on('match:queue_left', () => setPhase('idle'));

    socket.on('match:start', (data) => {
      setActiveMatch(data);
      setRounds([]);
      setFinalResult(null);
      setRoundResult(null);
      setPhase('playing');
    });

    socket.on('match:round_result', (data) => {
      setRoundResult(data);
      setRounds((prev) => [...prev, {
        roundNumber: data.roundNumber,
        movieTitle: '', // will be filled from activeMatch on next access
        realRating: data.realRating,
        yourRating: data.yourRating,
        yourRoundScore: data.yourRoundScore,
        opponentRating: data.opponentRating,
        opponentRoundScore: data.opponentRoundScore,
      }]);
      setPhase('round_result');
    });

    socket.on('match:round_start', (data) => {
      setActiveMatch((prev) => prev ? { ...prev, currentRound: data.currentRound, movie: data.movie } : prev);
      setRoundResult(null);
      setPhase('playing');
    });

    socket.on('match:end', (data) => {
      setFinalResult(data);
      setPhase('result');
    });

    socket.on('match:opponent_disconnected', () => {
      setActiveMatch(null);
      setPhase('disconnected');
    });

    return () => {
      socket.off('match:queue_joined');
      socket.off('match:queue_left');
      socket.off('match:start');
      socket.off('match:round_result');
      socket.off('match:round_start');
      socket.off('match:end');
      socket.off('match:opponent_disconnected');
    };
  }, [socket]);

  const joinQueue = useCallback(() => socket?.emit('match:join_queue'), [socket]);
  const leaveQueue = useCallback(() => socket?.emit('match:leave_queue'), [socket]);
  const submitRating = useCallback((rating: number) => {
    if (!activeMatch) return;
    socket?.emit('match:submit', { matchId: activeMatch.matchId, userRating: rating });
    setPhase('submitted');
  }, [socket, activeMatch]);
  const reset = useCallback(() => {
    setPhase('idle');
    setActiveMatch(null);
    setRoundResult(null);
    setRounds([]);
    setFinalResult(null);
  }, []);

  return (
    <MatchContext.Provider value={{ phase, activeMatch, roundResult, rounds, finalResult, countdown, joinQueue, leaveQueue, submitRating, reset }}>
      {children}
    </MatchContext.Provider>
  );
}

export function useMatch() { return useContext(MatchContext); }
