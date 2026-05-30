import { useState, useCallback } from 'react';
import { getMoviePair } from '../lib/api';
import type { HLMovie, MoviePair } from '../types/index';
import { Film, Heart, Flame, Shuffle, ChevronUp, ChevronDown } from 'lucide-react';

type Phase  = 'start' | 'loading' | 'playing' | 'reveal' | 'gameover';
type Guess  = 'A' | 'B';
type Winner = 'A' | 'B' | 'tie';

const MAX_LIVES = 3;

function scoreColor(s: number) {
  if (s >= 10) return 'text-purple-400';
  if (s >= 7)  return 'text-green-400';
  if (s >= 4)  return 'text-yellow-400';
  return 'text-primary';
}

function MovieCard({
  movie, side, phase, selected, winner, onPick,
}: {
  movie: HLMovie; side: Guess; phase: Phase;
  selected: Guess | null; winner: Winner | null; onPick: (g: Guess) => void;
}) {
  const isRevealed = phase === 'reveal';
  const isSelected = selected === side;
  const isWinner   = winner === side || winner === 'tie';
  const isCorrect  = isRevealed && isSelected && isWinner;
  const isWrong    = isRevealed && isSelected && !isWinner;

  return (
    <div
      onClick={() => phase === 'playing' && onPick(side)}
      className={`
        relative flex-1 overflow-hidden bg-black select-none
        transition-[filter] duration-300
        ${phase === 'playing' ? 'cursor-pointer' : ''}
        ${isRevealed && !isSelected && !isWinner ? 'brightness-75' : ''}
      `}
    >
      {movie.poster ? (
        <img src={movie.poster} alt={movie.title}
          className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ${phase === 'playing' ? 'hover:scale-105' : ''}`}
          draggable={false} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <Film className="w-20 h-20 text-gray-700" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10 pointer-events-none" />

      {isRevealed && (
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${isCorrect ? 'bg-green-500/20' : isWrong ? 'bg-red-500/20' : ''}`} />
      )}

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center text-center px-6 pb-10 pointer-events-none">
        <p className="text-gray-300 text-[11px] font-semibold uppercase tracking-widest mb-2 drop-shadow">Film</p>
        <h2 className="text-white font-black text-xl md:text-2xl leading-snug drop-shadow-lg line-clamp-3">{movie.title}</h2>
        {isRevealed && (
          <div className={`mt-4 px-6 py-2 rounded-full font-black text-2xl tabular-nums shadow-xl text-white ${isWinner && winner !== 'tie' ? 'bg-green-500' : winner === 'tie' ? 'bg-yellow-500' : 'bg-white/20 backdrop-blur-sm'}`}>
            ★ {movie.rating.toFixed(1)}
          </div>
        )}
      </div>

      {isRevealed && isSelected && (
        <div className={`absolute top-4 ${side === 'A' ? 'left-4' : 'right-4'} w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-xl shadow-xl pointer-events-none ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
          {isCorrect ? '✓' : '✗'}
        </div>
      )}
    </div>
  );
}

export default function HigherOrLowerPage() {
  const [phase, setPhase]         = useState<Phase>('start');
  const [pair, setPair]           = useState<MoviePair | null>(null);
  const [lives, setLives]         = useState(MAX_LIVES);
  const [score, setScore]         = useState(0);
  const [selected, setSelected]   = useState<Guess | null>(null);
  const [winner, setWinner]       = useState<Winner | null>(null);
  const [movieMode, setMovieMode] = useState<'popular' | 'any'>('popular');
  const [error, setError]         = useState('');
  const [advancing, setAdvancing] = useState(false);

  const loadPair = useCallback(async (mode?: 'popular' | 'any') => {
    setPhase('loading'); setSelected(null); setWinner(null); setAdvancing(false); setError('');
    try { setPair(await getMoviePair(mode ?? movieMode)); setPhase('playing'); }
    catch { setError('Errore nel caricamento dei film. Riprova.'); setPhase('start'); }
  }, [movieMode]);

  const handleStart = () => { setLives(MAX_LIVES); setScore(0); loadPair(movieMode); };

  const handlePick = (guess: Guess) => {
    if (!pair || phase !== 'playing') return;
    setSelected(guess);
    const { movieA, movieB } = pair;
    let w: Winner;
    if      (movieA.rating > movieB.rating) w = 'A';
    else if (movieB.rating > movieA.rating) w = 'B';
    else                                    w = 'tie';
    setWinner(w);
    const correct  = w === 'tie' || w === guess;
    const newLives = correct ? lives : lives - 1;
    setLives(newLives);
    setScore((s) => correct ? s + 1 : s);
    setPhase('reveal');
    if (newLives <= 0) setTimeout(() => setPhase('gameover'), 2400);
  };

  const handleNext = () => { if (advancing) return; setAdvancing(true); loadPair(); };

  return (
    <div className="flex flex-col bg-black" style={{ height: 'calc(100vh - 64px)' }}>

      {(phase === 'playing' || phase === 'reveal') && (
        <div className="absolute inset-x-0 z-30 flex items-center justify-between px-5 py-3 pointer-events-none" style={{ top: 64 }}>
          <div className="flex gap-1.5">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <Heart key={i} className={`w-6 h-6 drop-shadow transition-all ${i < lives ? 'text-red-500 fill-red-500' : 'text-white/25'}`} />
            ))}
          </div>
          <div className="bg-black/50 backdrop-blur-sm text-white rounded-xl px-4 py-1 font-black text-xl tabular-nums min-w-[2.5rem] text-center border border-white/10 shadow">{score}</div>
        </div>
      )}

      {error && (
        <div className="absolute inset-x-0 z-40 flex justify-center px-4 pointer-events-none" style={{ top: 110 }}>
          <div className="bg-red-900/90 backdrop-blur-sm border border-red-500/30 text-red-200 text-sm px-4 py-2.5 rounded-xl shadow-xl">{error}</div>
        </div>
      )}

      {phase === 'start' && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-gray-900 rounded-2xl border border-white/10 p-10 text-center space-y-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center"><ChevronUp className="w-7 h-7 text-green-400" /></div>
              <span className="font-black text-xl text-gray-500">VS</span>
              <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center"><ChevronDown className="w-7 h-7 text-red-400" /></div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Quale film ha il voto più alto?</h2>
              <p className="text-sm text-gray-400">Hai <strong className="text-white">3 vite</strong>. Sbagli → una vita in meno.</p>
            </div>
            <div className="inline-flex rounded-xl border border-white/10 overflow-hidden">
              {(['popular', 'any'] as const).map((m, i) => (
                <button key={m} onClick={() => setMovieMode(m)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${i > 0 ? 'border-l border-white/10' : ''} ${movieMode === m ? 'bg-primary text-white' : 'text-gray-400 hover:bg-white/5'}`}>
                  {m === 'popular' ? <><Flame className="w-4 h-4" />Famosi</> : <><Shuffle className="w-4 h-4" />Casuali</>}
                </button>
              ))}
            </div>
            <button onClick={handleStart} className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold px-8 py-3.5 rounded-xl transition-colors">
              <ChevronUp className="w-5 h-5" /> Inizia
            </button>
          </div>
        </div>
      )}

      {phase === 'loading' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
        </div>
      )}

      {(phase === 'playing' || phase === 'reveal') && pair && (
        <div className="flex-1 relative flex min-h-0">
          <MovieCard movie={pair.movieA} side="A" phase={phase} selected={selected} winner={winner} onPick={handlePick} />
          <div className="w-px bg-white/10 flex-shrink-0 z-10" />
          <MovieCard movie={pair.movieB} side="B" phase={phase} selected={selected} winner={winner} onPick={handlePick} />

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2">
            {phase === 'playing' && (
              <div className="w-14 h-14 rounded-full bg-gray-950/90 backdrop-blur-sm border-2 border-white/20 shadow-2xl flex items-center justify-center pointer-events-none">
                <span className="text-white font-black text-sm tracking-wide">VS</span>
              </div>
            )}
            {phase === 'reveal' && (
              <>
                <div className={`w-14 h-14 rounded-full border-4 shadow-2xl flex items-center justify-center text-white font-black text-2xl pointer-events-none ${winner === 'tie' ? 'bg-yellow-500 border-yellow-300' : winner === selected ? 'bg-green-500 border-green-300' : 'bg-red-500 border-red-300'}`}>
                  {winner === 'tie' ? '=' : winner === selected ? '✓' : '✗'}
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-widest drop-shadow pointer-events-none ${winner === 'tie' ? 'text-yellow-400' : winner === selected ? 'text-green-400' : 'text-red-400'}`}>
                  {winner === 'tie' ? 'Pareggio' : winner === selected ? 'Corretto' : 'Sbagliato'}
                </span>
                <button onClick={handleNext} disabled={advancing}
                  className="mt-1 bg-white hover:bg-gray-100 active:scale-95 text-gray-900 font-bold px-5 py-2 rounded-full shadow-2xl transition-all text-sm whitespace-nowrap disabled:opacity-50">
                  {advancing ? '…' : 'Avanti →'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {phase === 'gameover' && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-gray-900 rounded-2xl border border-white/10 p-10 text-center space-y-5 w-full max-w-md shadow-2xl">
            <div className="text-5xl">{score >= 15 ? '🏆' : score >= 10 ? '🌟' : score >= 5 ? '🎬' : '💀'}</div>
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">Punteggio finale</p>
              <p className={`text-8xl font-black tabular-nums ${scoreColor(score)}`}>{score}</p>
              <p className="text-sm text-gray-500 mt-1">risposte esatte</p>
            </div>
            <p className="text-sm text-gray-400 bg-white/5 rounded-xl px-5 py-3">
              {score >= 15 ? 'Sei un critico cinematografico nato!' : score >= 10 ? 'Ottima conoscenza del cinema!' : score >= 5 ? 'Puoi fare di meglio!' : score >= 1 ? "Ci vuole un po' di pratica!" : 'Meglio la prossima volta!'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={handleStart} className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold px-8 py-3 rounded-xl transition-colors">
                <ChevronUp className="w-5 h-5" /> Riprova
              </button>
              <button onClick={() => setPhase('start')} className="inline-flex items-center justify-center gap-2 border border-white/10 text-gray-400 hover:bg-white/5 font-medium px-6 py-3 rounded-xl transition-colors">
                Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}