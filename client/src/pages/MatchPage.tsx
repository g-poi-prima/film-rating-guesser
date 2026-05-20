import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import type { MatchStartPayload, MatchRoundResultPayload, MatchEndPayload } from '../context/SocketContext';
import { Swords, Loader2, AlertCircle, Film } from 'lucide-react';

type Phase = 'idle' | 'queuing' | 'playing' | 'submitted' | 'round_result' | 'result' | 'disconnected';

interface ActiveMatch {
  matchId: number;
  movie: MatchStartPayload['movie'];
  opponentUsername: string;
  totalRounds: number;
  currentRound: number;
}

interface RoundSummary {
  roundNumber: number;
  movieTitle: string;
  realRating: number;
  yourRating: number;
  yourRoundScore: number;
  opponentRating: number;
  opponentRoundScore: number;
}

export default function MatchPage() {
  const { socket } = useSocket();
  const [phase, setPhase] = useState<Phase>('idle');
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const [userRating, setUserRating] = useState(5);
  const [roundResult, setRoundResult] = useState<MatchRoundResultPayload | null>(null);
  const [rounds, setRounds] = useState<RoundSummary[]>([]);
  const [finalResult, setFinalResult] = useState<MatchEndPayload | null>(null);
  const [countdown, setCountdown] = useState(4);

  // Countdown while showing round result
  useEffect(() => {
    if (phase !== 'round_result') return;
    setCountdown(4);
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const reset = useCallback(() => {
    setPhase('idle');
    setActiveMatch(null);
    setRoundResult(null);
    setRounds([]);
    setFinalResult(null);
    setUserRating(5);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('match:queue_joined', () => setPhase('queuing'));
    socket.on('match:queue_left', () => setPhase('idle'));

    socket.on('match:start', (data) => {
      setActiveMatch(data);
      setRounds([]);
      setUserRating(5);
      setPhase('playing');
    });

    socket.on('match:round_result', (data) => {
      setRoundResult(data);
      setRounds((prev) => [
        ...prev,
        {
          roundNumber: data.roundNumber,
          movieTitle: activeMatch?.movie.title ?? '',
          realRating: data.realRating,
          yourRating: data.yourRating,
          yourRoundScore: data.yourRoundScore,
          opponentRating: data.opponentRating,
          opponentRoundScore: data.opponentRoundScore,
        },
      ]);
      setPhase('round_result');
    });

    socket.on('match:round_start', (data) => {
      setActiveMatch((prev) =>
        prev ? { ...prev, currentRound: data.currentRound, movie: data.movie } : prev
      );
      setUserRating(5);
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
  }, [socket, activeMatch?.movie.title]);

  const joinQueue = () => socket?.emit('match:join_queue');
  const leaveQueue = () => socket?.emit('match:leave_queue');
  const submitRating = () => {
    if (!activeMatch) return;
    socket?.emit('match:submit', { matchId: activeMatch.matchId, userRating });
    setPhase('submitted');
  };

  if (!socket) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
        <span className="text-gray-500 dark:text-gray-400">Connessione in corso...</span>
      </div>
    );
  }

  // ── Idle ─────────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-10 space-y-6">
          <Swords className="w-16 h-16 text-primary mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sfida 1v1</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
            5 film, punteggio cumulativo. Chi indovina i voti TMDB con più precisione vince. Il punteggio è esponenziale: gli errori grandi costano moltissimo.
          </p>
          <button
            onClick={joinQueue}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Cerca avversario
          </button>
        </div>
      </div>
    );
  }

  // ── Queuing ──────────────────────────────────────────────────────────────────
  if (phase === 'queuing') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-10 space-y-6">
          <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">In coda...</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">In attesa di un avversario</p>
          <button
            onClick={leaveQueue}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Annulla
          </button>
        </div>
      </div>
    );
  }

  // ── Playing / Submitted ──────────────────────────────────────────────────────
  if ((phase === 'playing' || phase === 'submitted') && activeMatch) {
    const { movie, opponentUsername, currentRound, totalRounds } = activeMatch;
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Round {currentRound}/{totalRounds}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalRounds }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-6 rounded-full transition-colors ${
                    i < currentRound - 1
                      ? 'bg-green-500'
                      : i === currentRound - 1
                      ? 'bg-primary'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            vs <span className="font-semibold text-gray-700 dark:text-gray-200">{opponentUsername}</span>
          </div>
        </div>

        {phase === 'submitted' && (
          <div className="mb-3 flex justify-end">
            <span className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              In attesa dell'avversario...
            </span>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden flex flex-col md:flex-row">
          {movie.poster ? (
            <div className="md:w-56 flex-shrink-0">
              <img
                src={`https://image.tmdb.org/t/p/w500${movie.poster}`}
                alt={movie.title}
                className="w-full h-72 md:h-full object-cover"
              />
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
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Il tuo voto</span>
                  <span className="text-3xl font-bold text-primary">{userRating.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0} max={10} step={0.1}
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
                <button
                  onClick={submitRating}
                  className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                >
                  Invia voto
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Round result ─────────────────────────────────────────────────────────────
  if (phase === 'round_result' && roundResult) {
    const myDiff = Math.abs(roundResult.yourRating - roundResult.realRating).toFixed(1);
    const oppDiff = Math.abs(roundResult.opponentRating - roundResult.realRating).toFixed(1);
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-7 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 dark:text-white">
              Round {roundResult.roundNumber}/{roundResult.totalRounds}
            </h2>
            {!roundResult.isLastRound && (
              <span className="text-xs text-gray-400">
                Prossimo round tra {countdown}s...
              </span>
            )}
          </div>

          {/* Real rating */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Voto reale TMDB</p>
            <p className="text-4xl font-bold text-primary">{roundResult.realRating.toFixed(1)}</p>
          </div>

          {/* Side by side */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 space-y-1">
              <p className="font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">Tu</p>
              <p className="text-xl font-bold text-primary">{roundResult.yourRating.toFixed(1)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">errore {myDiff}</p>
              <p className="font-bold text-amber-500">+{roundResult.yourRoundScore} pt</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Totale: {roundResult.yourTotal}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-1">
              <p className="font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">{roundResult.opponentUsername}</p>
              <p className="text-xl font-bold text-gray-700 dark:text-gray-200">{roundResult.opponentRating.toFixed(1)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">errore {oppDiff}</p>
              <p className="font-bold text-amber-500">+{roundResult.opponentRoundScore} pt</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Totale: {roundResult.opponentTotal}</p>
            </div>
          </div>

          {/* Running score bar */}
          {roundResult.yourTotal + roundResult.opponentTotal > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Tu: {roundResult.yourTotal}</span>
                <span>{roundResult.opponentUsername}: {roundResult.opponentTotal}</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                <div
                  className="bg-primary h-full transition-all duration-500"
                  style={{ width: `${(roundResult.yourTotal / (roundResult.yourTotal + roundResult.opponentTotal)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {roundResult.isLastRound && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Calcolo risultato finale...
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Final result ─────────────────────────────────────────────────────────────
  if (phase === 'result' && finalResult) {
    const iWon = finalResult.yourTotalScore > finalResult.opponentTotalScore;
    const tied = finalResult.yourTotalScore === finalResult.opponentTotalScore;

    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="text-5xl">{tied ? '🤝' : iWon ? '🏆' : '💀'}</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {tied ? 'Pareggio!' : iWon ? 'Hai vinto!' : 'Hai perso!'}
            </h1>
          </div>

          {/* Score comparison */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 text-center space-y-1">
              <p className="font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">Tu</p>
              <p className="text-3xl font-black text-primary">{finalResult.yourTotalScore}</p>
              <p className="text-xs text-gray-400">punti totali</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center space-y-1">
              <p className="font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">{finalResult.opponentUsername}</p>
              <p className="text-3xl font-black text-gray-700 dark:text-gray-200">{finalResult.opponentTotalScore}</p>
              <p className="text-xs text-gray-400">punti totali</p>
            </div>
          </div>

          {/* Round breakdown */}
          {rounds.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Dettaglio round</p>
              {rounds.map((r) => (
                <div key={r.roundNumber} className="flex items-center gap-3 text-xs bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2.5">
                  <span className="font-bold text-gray-400 w-4">{r.roundNumber}</span>
                  <span className="flex-1 truncate text-gray-600 dark:text-gray-300 font-medium">{r.movieTitle}</span>
                  <span className="text-gray-500 dark:text-gray-400">{r.realRating.toFixed(1)}</span>
                  <span className="font-bold text-primary w-10 text-right">+{r.yourRoundScore}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={reset}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Nuova partita
          </button>
        </div>
      </div>
    );
  }

  // ── Disconnected ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-10 space-y-6">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Avversario disconnesso</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Il tuo avversario ha abbandonato la partita.</p>
        <button
          onClick={reset}
          className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
        >
          Torna alla lobby
        </button>
      </div>
    </div>
  );
}
