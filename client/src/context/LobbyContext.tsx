import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from './SocketContext';
import type {
  LobbyChatMessage,
  LobbyFinishedPayload,
  LobbyRoundResultPayload,
  LobbyRoundStartPayload,
  LobbyStatePayload,
} from './SocketContext';

export type LobbyPhase =
  | 'idle'
  | 'waiting'
  | 'playing'
  | 'submitted'
  | 'round_result'
  | 'finished'
  | 'error';

interface Movie {
  id: number;
  title: string;
  overview: string;
  poster: string | null;
}

interface RoundInfo {
  currentRound: number;
  totalRounds: number;
  activePlayers: number;
  mode: string;
}

interface LobbyContextType {
  phase: LobbyPhase;
  lobbyState: LobbyStatePayload | null;
  movie: Movie | null;
  roundInfo: RoundInfo | null;
  roundResult: LobbyRoundResultPayload | null;
  finished: LobbyFinishedPayload | null;
  chatMessages: LobbyChatMessage[];
  userRating: number;
  setUserRating: (v: number) => void;
  countdown: number;
  errorMsg: string;
  createLobby: (data: {
    name: string;
    mode: 'ALL_VS_ALL' | 'TOURNAMENT';
    totalRounds?: number;
    filmMode?: 'popular' | 'any';
  }) => void;
  joinLobby: (code: string) => void;
  leaveLobby: () => void;
  startLobby: () => void;
  submitRating: () => void;
  sendChat: (text: string) => void;
  restartLobby: () => void;
}

const LobbyContext = createContext<LobbyContextType>({
  phase: 'idle',
  lobbyState: null,
  movie: null,
  roundInfo: null,
  roundResult: null,
  finished: null,
  chatMessages: [],
  userRating: 5,
  setUserRating: () => {},
  countdown: 4,
  errorMsg: '',
  createLobby: () => {},
  joinLobby: () => {},
  leaveLobby: () => {},
  startLobby: () => {},
  submitRating: () => {},
  sendChat: () => {},
  restartLobby: () => {},
});

export function LobbyProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<LobbyPhase>('idle');
  const [lobbyState, setLobbyState] = useState<LobbyStatePayload | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [roundInfo, setRoundInfo] = useState<RoundInfo | null>(null);
  const [roundResult, setRoundResult] = useState<LobbyRoundResultPayload | null>(null);
  const [finished, setFinished] = useState<LobbyFinishedPayload | null>(null);
  const [chatMessages, setChatMessages] = useState<LobbyChatMessage[]>([]);
  const [userRating, setUserRating] = useState(5);
  const [countdown, setCountdown] = useState(4);
  const [errorMsg, setErrorMsg] = useState('');

  // Refs to read latest values inside stable callbacks / event handlers
  const lobbyStateRef = useRef<LobbyStatePayload | null>(null);
  lobbyStateRef.current = lobbyState;
  const phaseRef = useRef<LobbyPhase>('idle');
  phaseRef.current = phase;
  const userRatingRef = useRef(5);
  userRatingRef.current = userRating;

  // ── Countdown timer during round_result ────────────────────────────────────
  useEffect(() => {
    if (phase !== 'round_result') return;
    setCountdown(4);
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // ── Reset all state when socket goes away (logout / token expired) ─────────
  useEffect(() => {
    if (!socket) {
      setPhase('idle');
      setLobbyState(null);
      setMovie(null);
      setRoundInfo(null);
      setRoundResult(null);
      setFinished(null);
      setChatMessages([]);
      setErrorMsg('');
    }
  }, [socket]);

  // ── Register socket event handlers once per socket instance ───────────────
  useEffect(() => {
    if (!socket) return;

    const onState = (data: LobbyStatePayload) => {
      const wasInLobby = lobbyStateRef.current !== null;
      setLobbyState(data);
      setChatMessages(data.chatMessages ?? []);

      if (data.status === 'WAITING') {
        setPhase('waiting');
        setFinished(null);
        setMovie(null);
        setRoundInfo(null);
        setRoundResult(null);
        // Navigate into lobby only on first join (not on subsequent state updates)
        if (!wasInLobby) navigate(`/lobby/${data.code}`);
      } else if (data.status === 'IN_PROGRESS') {
        // Reconnect after page refresh: snap to playing; don't override mid-round phases
        const cur = phaseRef.current;
        if (cur === 'idle' || cur === 'waiting' || cur === 'error') {
          setPhase('playing');
        }
        if (!wasInLobby) navigate(`/lobby/${data.code}`);
      } else if (data.status === 'FINISHED') {
        if (phaseRef.current !== 'finished') setPhase('finished');
        if (!wasInLobby) navigate(`/lobby/${data.code}`);
      }
    };

    const onRoundStart = (data: LobbyRoundStartPayload) => {
      setMovie(data.movie);
      setRoundInfo({
        currentRound: data.currentRound,
        totalRounds: data.totalRounds,
        activePlayers: data.activePlayers,
        mode: data.mode,
      });
      setRoundResult(null);
      setUserRating(5);
      setPhase('playing');
    };

    const onRoundResult = (data: LobbyRoundResultPayload) => {
      setRoundResult(data);
      setPhase('round_result');
    };

    const onFinished = (data: LobbyFinishedPayload) => {
      setFinished(data);
      setPhase('finished');
    };

    // Only treat as fatal error when we're actually inside a lobby session
    const onError = (data: { message: string }) => {
      if (phaseRef.current !== 'idle') {
        setErrorMsg(data.message);
        setPhase('error');
        setLobbyState(null);
      }
    };

    const onChat = (msg: LobbyChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    };

    socket.on('lobby:state', onState);
    socket.on('lobby:round_start', onRoundStart);
    socket.on('lobby:round_result', onRoundResult);
    socket.on('lobby:finished', onFinished);
    socket.on('lobby:error', onError);
    socket.on('lobby:chat', onChat);

    return () => {
      socket.off('lobby:state', onState);
      socket.off('lobby:round_start', onRoundStart);
      socket.off('lobby:round_result', onRoundResult);
      socket.off('lobby:finished', onFinished);
      socket.off('lobby:error', onError);
      socket.off('lobby:chat', onChat);
    };
  }, [socket, navigate]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const createLobby = useCallback(
    (data: {
      name: string;
      mode: 'ALL_VS_ALL' | 'TOURNAMENT';
      totalRounds?: number;
      filmMode?: 'popular' | 'any';
    }) => {
      socket?.emit('lobby:create', data);
    },
    [socket]
  );

  const joinLobby = useCallback(
    (code: string) => {
      socket?.emit('lobby:join', { code: code.toUpperCase() });
    },
    [socket]
  );

  const leaveLobby = useCallback(() => {
    const code = lobbyStateRef.current?.code;
    // Only emit leave if we're truly in a lobby (not in error state where lobby may already be gone)
    if (code && phaseRef.current !== 'error') {
      socket?.emit('lobby:leave', { code });
    }
    setPhase('idle');
    setLobbyState(null);
    setMovie(null);
    setRoundInfo(null);
    setRoundResult(null);
    setFinished(null);
    setChatMessages([]);
    setErrorMsg('');
    navigate('/lobbies');
  }, [socket, navigate]);

  const startLobby = useCallback(() => {
    const code = lobbyStateRef.current?.code;
    if (!code) return;
    socket?.emit('lobby:start', { code });
  }, [socket]);

  const submitRating = useCallback(() => {
    const code = lobbyStateRef.current?.code;
    if (!code) return;
    socket?.emit('lobby:submit', { code, userRating: userRatingRef.current });
    setPhase('submitted');
  }, [socket]);

  const sendChat = useCallback(
    (text: string) => {
      const code = lobbyStateRef.current?.code;
      if (!code || !text.trim()) return;
      socket?.emit('lobby:chat', { code, text: text.trim() });
    },
    [socket]
  );

  const restartLobby = useCallback(() => {
    const code = lobbyStateRef.current?.code;
    if (!code) return;
    socket?.emit('lobby:restart', { code });
  }, [socket]);

  return (
    <LobbyContext.Provider
      value={{
        phase,
        lobbyState,
        movie,
        roundInfo,
        roundResult,
        finished,
        chatMessages,
        userRating,
        setUserRating,
        countdown,
        errorMsg,
        createLobby,
        joinLobby,
        leaveLobby,
        startLobby,
        submitRating,
        sendChat,
        restartLobby,
      }}
    >
      {children}
    </LobbyContext.Provider>
  );
}

export function useLobby() {
  return useContext(LobbyContext);
}
