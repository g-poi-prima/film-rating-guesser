import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import type { MatchStartPayload, MatchEndPayload } from '../context/SocketContext';
import { Swords, Loader2, AlertCircle, Film } from 'lucide-react';

type Phase = 'idle' | 'queuing' | 'playing' | 'submitted' | 'result' | 'disconnected';

interface ActiveMatch {
  matchId: number;
  movie: MatchStartPayload['movie'];
  opponentUsername: string;
}

export default function MatchPage() {
  const { socket } = useSocket();
  const [phase, setPhase] = useState<Phase>('idle');
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const [userRating, setUserRating] = useState(5);
  const [result, setResult] = useState<MatchEndPayload | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('match:queue_joined', () => setPhase('queuing'));
    socket.on('match:queue_left', () => setPhase('idle'));
    socket.on('match:start', (data) => {
      setActiveMatch(data);
      setUserRating(5);
      setPhase('playing');
    });
    socket.on('match:end', (data) => {
      setResult(data);
      setActiveMatch(null);
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
      socket.off('match:end');
      socket.off('match:opponent_disconnected');
    };
  }, [socket]);

  const joinQueue = () => socket?.emit('match:join_queue');
  const leaveQueue = () => socket?.emit('match:leave_queue');
  const submitRating = () => {
    if (!activeMatch) return;
    socket?.emit('match:submit', { matchId: activeMatch.matchId, userRating });
    setPhase('submitted');
  };
  const reset = () => { setPhase('idle'); setResult(null); };

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
            Entra in coda e affronta un avversario in tempo reale. Chi indovina il voto TMDB con più precisione vince!
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
    const { movie, opponentUsername } = activeMatch;
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            vs <span className="font-semibold text-gray-700 dark:text-gray-200">{opponentUsername}</span>
          </span>
          {phase === 'submitted' && (
            <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              In attesa dell'avversario...
            </span>
          )}
        </div>

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

  // ── Result ───────────────────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    const myDiff = Math.abs(result.yourRating - result.realRating).toFixed(1);
    const oppDiff = Math.abs(result.opponentRating - result.realRating).toFixed(1);
    const iWon = result.yourScore > result.opponentScore;
    const tied = result.yourScore === result.opponentScore;

    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 space-y-6 text-center">
          <div className="text-5xl">{tied ? '🤝' : iWon ? '🏆' : '💀'}</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {tied ? 'Pareggio!' : iWon ? 'Hai vinto!' : 'Hai perso!'}
          </h1>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Voto reale TMDB</p>
            <p className="text-4xl font-bold text-primary">{result.realRating.toFixed(1)}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 space-y-1">
              <p className="font-semibold text-gray-700 dark:text-gray-300">Tu</p>
              <p className="text-xl font-bold text-primary">{result.yourRating.toFixed(1)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">errore {myDiff}</p>
              <p className="text-lg font-bold text-amber-500">{result.yourScore} pt</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-1">
              <p className="font-semibold text-gray-700 dark:text-gray-300">{result.opponentUsername}</p>
              <p className="text-xl font-bold text-gray-700 dark:text-gray-200">{result.opponentRating.toFixed(1)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">errore {oppDiff}</p>
              <p className="text-lg font-bold text-amber-500">{result.opponentScore} pt</p>
            </div>
          </div>

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
