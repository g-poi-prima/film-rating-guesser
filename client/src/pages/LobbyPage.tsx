import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import type { LobbyStatePayload, LobbyRoundStartPayload, LobbyRoundResultPayload, LobbyFinishedPayload } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Users, Film, Loader2, Trophy, Crown, Swords, AlertCircle } from 'lucide-react';

type LobbyPhase = 'waiting' | 'playing' | 'submitted' | 'round_result' | 'finished' | 'error';

interface Movie { id: number; title: string; overview: string; poster: string | null; }

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>();
  const { socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<LobbyPhase>('waiting');
  const [lobbyState, setLobbyState] = useState<LobbyStatePayload | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [roundInfo, setRoundInfo] = useState<{ currentRound: number; totalRounds: number; activePlayers: number; mode: string } | null>(null);
  const [roundResult, setRoundResult] = useState<LobbyRoundResultPayload | null>(null);
  const [finished, setFinished] = useState<LobbyFinishedPayload | null>(null);
  const [userRating, setUserRating] = useState(5);
  const [countdown, setCountdown] = useState(4);
  const [errorMsg, setErrorMsg] = useState('');
  // Used to distinguish a real unmount from React StrictMode's double-invocation
  const mountedRef = useRef(false);

  // Countdown during round_result
  useEffect(() => {
    if (phase !== 'round_result') return;
    setCountdown(4);
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (!socket || !code) return;
    const key = code.toUpperCase();

    // Mark as mounted and cancel any pending leave from a previous cleanup
    mountedRef.current = true;

    socket.emit('lobby:join', { code: key });

    const onState = (data: LobbyStatePayload) => {
      setLobbyState(data);
      if (data.status === 'WAITING') setPhase('waiting');
    };
    const onRoundStart = (data: LobbyRoundStartPayload) => {
      setMovie(data.movie);
      setRoundInfo({ currentRound: data.currentRound, totalRounds: data.totalRounds, activePlayers: data.activePlayers, mode: data.mode });
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
    const onError = (data: { message: string }) => {
      setErrorMsg(data.message);
      setPhase('error');
    };

    socket.on('lobby:state', onState);
    socket.on('lobby:round_start', onRoundStart);
    socket.on('lobby:round_result', onRoundResult);
    socket.on('lobby:finished', onFinished);
    socket.on('lobby:error', onError);

    return () => {
      socket.off('lobby:state', onState);
      socket.off('lobby:round_start', onRoundStart);
      socket.off('lobby:round_result', onRoundResult);
      socket.off('lobby:finished', onFinished);
      socket.off('lobby:error', onError);

      // Delay the leave so React StrictMode's immediate remount can cancel it.
      // StrictMode runs cleanup + remount in <1 ms; a real navigation takes longer.
      mountedRef.current = false;
      const s = socket;
      setTimeout(() => {
        if (!mountedRef.current) {
          s.emit('lobby:leave', { code: key });
        }
      }, 200);
    };
  }, [socket, code]);

  const startLobby = useCallback(() => {
    if (!code) return;
    socket?.emit('lobby:start', { code: code.toUpperCase() });
  }, [socket, code]);

  const submitRating = useCallback(() => {
    if (!code) return;
    socket?.emit('lobby:submit', { code: code.toUpperCase(), userRating });
    setPhase('submitted');
  }, [socket, code, userRating]);

  const myPlayer = lobbyState?.players.find((p) => p.userId === user?.id);
  const isHost = lobbyState?.hostId === user?.id;
  const isEliminated = myPlayer?.eliminated ?? false;

  // ── Error ────────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-10 space-y-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{errorMsg || 'Errore lobby'}</h1>
          <button onClick={() => navigate('/lobbies')} className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors">
            Torna alle lobby
          </button>
        </div>
      </div>
    );
  }

  // ── Waiting room ─────────────────────────────────────────────────────────────
  if (phase === 'waiting') {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-7 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white text-lg">{lobbyState?.name || 'Lobby'}</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {lobbyState?.mode === 'ALL_VS_ALL' ? 'Tutti contro tutti' : 'Torneo ad eliminazione'} · {lobbyState?.totalRounds} round
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-0.5">Codice</p>
              <p className="font-mono font-bold text-primary text-lg tracking-widest">{code?.toUpperCase()}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Giocatori ({lobbyState?.players.length ?? 0})</p>
            {lobbyState?.players.map((p) => (
              <div key={p.userId} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">{p.username.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">{p.username}</span>
                {p.userId === lobbyState.hostId && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                {p.userId === user?.id && <span className="text-xs text-primary font-medium">(tu)</span>}
              </div>
            ))}
          </div>

          {isHost ? (
            <button
              onClick={startLobby}
              disabled={(lobbyState?.players.length ?? 0) < 2}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(lobbyState?.players.length ?? 0) < 2 ? 'Aspetta almeno 2 giocatori' : 'Avvia partita'}
            </button>
          ) : (
            <p className="text-center text-sm text-gray-400">In attesa che l'host avvii la partita...</p>
          )}
        </div>
      </div>
    );
  }

  // ── Playing / Submitted ──────────────────────────────────────────────────────
  if ((phase === 'playing' || phase === 'submitted') && movie && roundInfo) {
    const submittedCount = lobbyState?.players.filter((p) => !p.eliminated).length ?? 0;
    // We track submitted via lobby:state updates but just show a simple count
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Round {roundInfo.currentRound}/{roundInfo.totalRounds}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: roundInfo.totalRounds }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-5 rounded-full transition-colors ${
                    i < roundInfo.currentRound - 1 ? 'bg-green-500' : i === roundInfo.currentRound - 1 ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            {roundInfo.mode === 'TOURNAMENT' && <Swords className="w-4 h-4" />}
            <span>{roundInfo.activePlayers} attivi</span>
          </div>
        </div>

        {isEliminated && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
            Sei stato eliminato. Guarda il round in corso.
          </div>
        )}

        {phase === 'submitted' && !isEliminated && (
          <div className="mb-3 flex justify-end">
            <span className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Voto inviato — in attesa degli altri...
            </span>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden flex flex-col md:flex-row">
          {movie.poster ? (
            <div className="md:w-56 flex-shrink-0">
              <img src={`https://image.tmdb.org/t/p/w500${movie.poster}`} alt={movie.title} className="w-full h-72 md:h-full object-cover" />
            </div>
          ) : (
            <div className="md:w-56 h-72 flex-shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Film className="w-16 h-16 text-gray-400" />
            </div>
          )}

          <div className="flex-1 p-6 flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{movie.title}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed line-clamp-5">{movie.overview}</p>

            <div className="mt-auto space-y-4">
              {!isEliminated && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Il tuo voto</span>
                      <span className="text-3xl font-bold text-primary">{userRating.toFixed(1)}</span>
                    </div>
                    <input
                      type="range" min={0} max={10} step={0.1}
                      value={userRating}
                      onChange={(e) => setUserRating(parseFloat(e.target.value))}
                      disabled={phase === 'submitted'}
                      className="w-full accent-primary disabled:opacity-50"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>0</span><span>5</span><span>10</span>
                    </div>
                  </div>
                  {phase === 'playing' && (
                    <button onClick={submitRating} className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors">
                      Invia voto
                    </button>
                  )}
                </>
              )}

              {/* Players progress */}
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {lobbyState?.players.map((p) => (
                  <div key={p.userId} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${p.eliminated ? 'opacity-40' : 'bg-gray-50 dark:bg-gray-800'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.eliminated ? 'bg-gray-300' : 'bg-green-400'}`} />
                    <span className="truncate text-gray-600 dark:text-gray-400">{p.username}</span>
                    {p.userId === user?.id && <span className="text-primary ml-auto">●</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Round result ─────────────────────────────────────────────────────────────
  if (phase === 'round_result' && roundResult) {
    const myResult = roundResult.results.find((r) => r.userId === user?.id);
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-7 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 dark:text-white">
              Round {roundResult.roundNumber}/{roundResult.totalRounds}
            </h2>
            {!roundResult.isLastRound && (
              <span className="text-xs text-gray-400">Prossimo round tra {countdown}s...</span>
            )}
          </div>

          {/* Real rating */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Voto reale TMDB</p>
            <p className="text-4xl font-bold text-primary">{roundResult.realRating.toFixed(1)}</p>
          </div>

          {/* My result */}
          {myResult && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Il tuo voto</p>
                <p className="text-xl font-bold text-primary">{myResult.rating.toFixed(1)}</p>
                <p className="text-xs text-gray-400">errore {Math.abs(myResult.rating - roundResult.realRating).toFixed(1)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-amber-500 text-lg">+{myResult.roundScore} pt</p>
                <p className="text-xs text-gray-400">Totale: {myResult.totalScore}</p>
              </div>
            </div>
          )}

          {/* Eliminated */}
          {roundResult.eliminated.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 rounded-xl p-3">
              <p className="text-xs font-semibold text-red-500 mb-1">Eliminati questo round:</p>
              {roundResult.eliminated.map((uid) => {
                const r = roundResult.results.find((r) => r.userId === uid);
                return r ? <p key={uid} className="text-xs text-red-400">{r.username}</p> : null;
              })}
            </div>
          )}

          {/* Leaderboard */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Classifica round</p>
            {roundResult.results.map((r, i) => (
              <div
                key={r.userId}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${
                  r.eliminated
                    ? 'opacity-40 bg-gray-50 dark:bg-gray-800'
                    : r.userId === user?.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/20'
                    : 'bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <span className="font-bold text-gray-400 w-4 text-xs">{i + 1}</span>
                <span className="flex-1 truncate font-medium text-gray-700 dark:text-gray-300">{r.username}</span>
                <span className="text-gray-500 dark:text-gray-400 text-xs">{r.rating.toFixed(1)}</span>
                <span className="font-bold text-amber-500 w-12 text-right">+{r.roundScore}</span>
                <span className="font-bold text-primary w-10 text-right">{r.totalScore}</span>
              </div>
            ))}
          </div>

          {roundResult.isLastRound && (
            <p className="text-center text-sm text-gray-400">Calcolo risultati finali...</p>
          )}
        </div>
      </div>
    );
  }

  // ── Finished ─────────────────────────────────────────────────────────────────
  if (phase === 'finished' && finished) {
    const myRank = finished.results.find((r) => r.userId === user?.id);
    const iWon = myRank?.rank === 1;

    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="text-5xl">{iWon ? '🏆' : myRank?.rank === 2 ? '🥈' : myRank?.rank === 3 ? '🥉' : '🎮'}</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {iWon ? 'Hai vinto!' : `${myRank?.rank}° posto`}
            </h1>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Classifica finale</p>
            {finished.results.map((r) => (
              <div
                key={r.userId}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl ${
                  r.userId === user?.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-primary/20'
                    : 'bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <span className="text-lg w-8 text-center flex-shrink-0">
                  {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{r.username}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-primary">{r.totalScore}</p>
                  <p className="text-xs text-gray-400">punti</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/lobbies')}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Torna alle lobby
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
      <span className="text-gray-500 dark:text-gray-400">Connessione alla lobby...</span>
    </div>
  );
}
