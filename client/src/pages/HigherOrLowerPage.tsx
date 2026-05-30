import { useState, useCallback } from 'react';
import { getMoviePair } from '../lib/api';
import type { HLMovie, MoviePair } from '../types/index';
import { Film, Heart, Flame, Shuffle, ChevronUp, ChevronDown, Minus, ArrowRight } from 'lucide-react';

type Phase  = 'start' | 'loading' | 'playing' | 'reveal' | 'gameover';
type Guess  = 'A' | 'B';
type Winner = 'A' | 'B' | 'tie';

const MAX_LIVES = 3;

function ratingColor(r: number) {
  if (r >= 7.5) return 'text-green-400';
  if (r >= 6.0) return 'text-yellow-400';
  if (r >= 5.0) return 'text-orange-400';
  return 'text-red-400';
}

function scoreColor(s: number) {
  if (s >= 10) return 'text-purple-500';
  if (s >= 7)  return 'text-green-500';
  if (s >= 4)  return 'text-yellow-500';
  return 'text-primary';
}

// ── Movie Card ────────────────────────────────────────────────────────────────

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

  // Border ring
  let ring = '';
  if (!isRevealed && isSelected)               ring = 'ring-4 ring-primary';
  if (isRevealed && isCorrect)                 ring = 'ring-4 ring-green-500';
  if (isRevealed && isWrong)                   ring = 'ring-4 ring-red-500';
  if (isRevealed && !isSelected && isWinner && winner !== 'tie') ring = 'ring-2 ring-green-400/50';

  return (
    <div
      onClick={() => phase === 'playing' && onPick(side)}
      className={`
        relative flex-1 rounded-2xl overflow-hidden shadow-md bg-gray-900
        transition-all duration-200
        ${ring}
        ${phase === 'playing' ? 'cursor-pointer hover:scale-[1.015] hover:shadow-xl active:scale-[0.99]' : ''}
      `}
    >
      {/* Poster */}
      {movie.poster ? (
        <img
          src={movie.poster}
          alt={movie.title}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <Film className="w-16 h-16 text-gray-600" />
        </div>
      )}

      {/* Bottom gradient + title */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-4 px-4 pointer-events-none">
        <h2 className="text-white font-bold text-base leading-snug line-clamp-2 drop-shadow">
          {movie.title}
        </h2>
      </div>

      {/* Rating badge — always visible on reveal */}
      {isRevealed && (
        <div className={`
          absolute top-3 right-3 rounded-xl px-3 py-1.5 font-black text-xl tabular-nums shadow-lg pointer-events-none
          ${isWinner && winner !== 'tie' ? 'bg-green-500 text-white' : winner === 'tie' ? 'bg-yellow-500 text-white' : 'bg-black/70 text-white'}
        `}>
          ★ {movie.rating.toFixed(1)}
        </div>
      )}

      {/* Outcome overlay */}
      {isRevealed && isSelected && (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-black text-4xl shadow-xl border-4 ${isCorrect ? 'bg-green-500 border-green-300' : 'bg-red-500 border-red-300'}`}>
            {isCorrect ? '✓' : '✗'}
          </div>
        </div>
      )}

      {/* "Più alto" tag for unselected winner */}
      {isRevealed && !isSelected && winner === side && (
        <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg pointer-events-none shadow">
          ↑ PIÙ ALTO
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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
    setPhase('loading');
    setSelected(null);
    setWinner(null);
    setAdvancing(false);
    setError('');
    try {
      setPair(await getMoviePair(mode ?? movieMode));
      setPhase('playing');
    } catch {
      setError('Errore nel caricamento dei film. Riprova.');
      setPhase('start');
    }
  }, [movieMode]);

  const handleStart = () => {
    setLives(MAX_LIVES);
    setScore(0);
    loadPair(movieMode);
  };

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

    if (newLives <= 0) setTimeout(() => setPhase('gameover'), 2200);
  };

  const handleNext = () => {
    if (advancing) return;
    setAdvancing(true);
    loadPair();
  };

  const revealMsg = () => {
    if (!selected || !winner) return '';
    if (winner === 'tie') return '🟡 Pareggio! Punto bonus!';
    return winner === selected ? '✅ Corretto!' : '❌ Sbagliato!';
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-4 md:px-8 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-1.5">
              <ChevronUp className="w-5 h-5 text-green-500" />
              <ChevronDown className="w-5 h-5 text-red-500" />
              Higher or Lower
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Scegli il film con il voto TMDB più alto · 3 vite
            </p>
          </div>

          {(phase === 'playing' || phase === 'reveal') && (
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                {Array.from({ length: MAX_LIVES }).map((_, i) => (
                  <Heart key={i} className={`w-6 h-6 transition-all ${
                    i < lives ? 'text-red-500 fill-red-500' : 'text-gray-300 dark:text-gray-700'
                  }`} />
                ))}
              </div>
              <div className="bg-primary/10 text-primary rounded-xl px-4 py-1 font-black text-2xl tabular-nums min-w-[3rem] text-center">
                {score}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex-shrink-0 px-4 md:px-8 mt-3">
          <div className="max-w-5xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl">
            {error}
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-4 md:px-8 py-4 relative">

        {/* START */}
        {phase === 'start' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center space-y-5 w-full max-w-md shadow-sm">
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center">
                <ChevronUp className="w-7 h-7 text-green-500" />
              </div>
              <span className="font-black text-lg text-gray-400">VS</span>
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center">
                <ChevronDown className="w-7 h-7 text-red-500" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-1">Quale film ha il voto più alto?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Hai <strong>3 vite</strong>. Sbagli → una vita in meno. Quanto riesci ad andare?
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {(['popular', 'any'] as const).map((m, i) => (
                <button
                  key={m}
                  onClick={() => setMovieMode(m)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${i > 0 ? 'border-l border-gray-200 dark:border-gray-700' : ''} ${movieMode === m ? 'bg-primary text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                >
                  {m === 'popular' ? <><Flame className="w-4 h-4" /> Famosi</> : <><Shuffle className="w-4 h-4" /> Casuali</>}
                </button>
              ))}
            </div>
            <button onClick={handleStart} className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3 rounded-xl transition-colors">
              <ChevronUp className="w-5 h-5" /> Inizia
            </button>
          </div>
        )}

        {/* LOADING */}
        {phase === 'loading' && (
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
        )}

        {/* PLAYING / REVEAL */}
        {(phase === 'playing' || phase === 'reveal') && pair && (
          <div className="w-full max-w-5xl flex gap-4 h-full">
            <MovieCard movie={pair.movieA} side="A" phase={phase} selected={selected} winner={winner} onPick={handlePick} />

            {/* VS divider */}
            <div className="flex flex-col items-center justify-center flex-shrink-0 gap-2">
              <div className="flex-1 w-px bg-gray-200 dark:bg-gray-700" />
              <div>
                {phase === 'reveal' && winner === 'tie' ? (
                  <div className="w-10 h-10 rounded-full bg-yellow-500/10 border-2 border-yellow-400 flex items-center justify-center">
                    <Minus className="w-5 h-5 text-yellow-500" />
                  </div>
                ) : phase === 'reveal' && winner ? (
                  <div className="w-10 h-10 rounded-full bg-green-500/10 border-2 border-green-400 flex items-center justify-center">
                    <ChevronUp className={`w-5 h-5 text-green-500 transition-transform ${winner === 'B' ? 'rotate-180' : ''}`} />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs font-black text-gray-400 shadow-sm">
                    VS
                  </div>
                )}
              </div>
              <div className="flex-1 w-px bg-gray-200 dark:bg-gray-700" />
            </div>

            <MovieCard movie={pair.movieB} side="B" phase={phase} selected={selected} winner={winner} onPick={handlePick} />
          </div>
        )}

        {/* ── Reveal overlay ── */}
        {phase === 'reveal' && lives > 0 && pair && (
          <div
            className="absolute inset-0 z-20 flex items-end justify-center pb-8"
            style={{ backdropFilter: 'blur(3px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl px-8 py-6 text-center space-y-4 mx-4 w-full max-w-sm">
              {/* Outcome */}
              <div className={`text-lg font-bold ${
                winner === 'tie' ? 'text-yellow-500' :
                winner === selected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                <span className="text-2xl block mb-0.5">
                  {winner === 'tie' ? '🟡' : winner === selected ? '✅' : '❌'}
                </span>
                {revealMsg()}
              </div>

              {/* Both ratings */}
              <div className="flex items-center justify-center gap-6 py-1">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1 max-w-[90px] truncate">{pair.movieA.title}</p>
                  <p className={`text-3xl font-black tabular-nums ${ratingColor(pair.movieA.rating)}`}>
                    {pair.movieA.rating.toFixed(1)}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1 max-w-[90px] truncate">{pair.movieB.title}</p>
                  <p className={`text-3xl font-black tabular-nums ${ratingColor(pair.movieB.rating)}`}>
                    {pair.movieB.rating.toFixed(1)}
                  </p>
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={advancing}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-60"
              >
                <Film className="w-4 h-4" />
                {advancing ? 'Caricamento…' : 'Prossima coppia'}
              </button>
            </div>
          </div>
        )}

        {/* GAME OVER */}
        {phase === 'gameover' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center space-y-5 w-full max-w-md shadow-sm">
            <div className="text-5xl">
              {score >= 15 ? '🏆' : score >= 10 ? '🌟' : score >= 5 ? '🎬' : '💀'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Punteggio finale</p>
              <p className={`text-8xl font-black tabular-nums ${scoreColor(score)}`}>{score}</p>
              <p className="text-sm text-gray-400 mt-1">risposte esatte</p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl px-5 py-3">
              {score >= 15 ? 'Sei un critico cinematografico nato!' :
               score >= 10 ? 'Ottima conoscenza del cinema!' :
               score >= 5  ? 'Puoi fare di meglio!' :
               score >= 1  ? 'Ci vuole un po\' di pratica!' : 'Meglio la prossima volta!'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={handleStart} className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3 rounded-xl transition-colors">
                <ChevronUp className="w-5 h-5" /> Riprova
              </button>
              <button onClick={() => setPhase('start')} className="inline-flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium px-6 py-3 rounded-xl transition-colors">
                Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
