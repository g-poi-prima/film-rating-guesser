import { useState, useCallback } from 'react';
import { getMoviePair } from '../lib/api';
import type { HLMovie, MoviePair } from '../types/index';
import { Film, Heart, Flame, Shuffle, ChevronUp, ChevronDown, Minus } from 'lucide-react';

type Phase = 'start' | 'loading' | 'playing' | 'reveal' | 'gameover';
type Guess = 'A' | 'B';
type Winner = 'A' | 'B' | 'tie';

const MAX_LIVES = 3;

function scoreColor(s: number) {
  if (s >= 10) return 'text-purple-500';
  if (s >= 7)  return 'text-green-500';
  if (s >= 4)  return 'text-yellow-500';
  return 'text-primary';
}

function MovieCard({
  movie,
  side,
  phase,
  selected,
  winner,
  guess,
  onPick,
}: {
  movie: HLMovie;
  side: Guess;
  phase: Phase;
  selected: Guess | null;
  winner: Winner | null;
  guess: Guess | null;
  onPick: (g: Guess) => void;
}) {
  const isRevealed = phase === 'reveal';
  const isSelected = selected === side;
  const isWinner = winner === side || winner === 'tie';
  const isCorrect = isRevealed && isSelected && isWinner;
  const isWrong   = isRevealed && isSelected && !isWinner;

  const borderClass = isRevealed
    ? isCorrect ? 'border-green-500 ring-2 ring-green-400/30'
    : isWrong   ? 'border-red-500 ring-2 ring-red-400/30'
    : winner === side ? 'border-green-400/50'
    : 'border-gray-200 dark:border-gray-700'
    : isSelected && !isRevealed
    ? 'border-primary ring-2 ring-primary/20'
    : 'border-gray-200 dark:border-gray-800 hover:border-primary/40 hover:shadow-md cursor-pointer';

  const ratingColor =
    movie.rating >= 7.5 ? 'text-green-500' :
    movie.rating >= 6.0 ? 'text-yellow-500' :
    movie.rating >= 5.0 ? 'text-orange-500' : 'text-red-500';

  return (
    <div
      onClick={() => phase === 'playing' && onPick(side)}
      className={`flex-1 rounded-2xl border-2 bg-white dark:bg-gray-900 overflow-hidden transition-all duration-200 ${borderClass} ${phase === 'playing' ? 'cursor-pointer select-none' : ''}`}
    >
      {/* Poster */}
      <div className="relative bg-gray-100 dark:bg-gray-800 aspect-[2/3] overflow-hidden">
        {movie.poster ? (
          <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
            <Film className="w-12 h-12" />
          </div>
        )}

        {/* Rating badge — only on reveal */}
        {isRevealed && (
          <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full font-black text-xl tabular-nums text-white shadow-lg ${
            isWinner && winner !== 'tie' ? 'bg-green-500' : winner === 'tie' ? 'bg-yellow-500' : 'bg-gray-600'
          }`}>
            {movie.rating.toFixed(1)}
          </div>
        )}

        {/* Result overlay */}
        {isRevealed && isSelected && (
          <div className={`absolute inset-0 flex items-center justify-center ${isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-2xl ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
              {isCorrect ? '✓' : '✗'}
            </div>
          </div>
        )}

        {/* Arrow indicator — winner on reveal when not selected */}
        {isRevealed && !isSelected && winner === side && winner !== 'tie' && (
          <div className="absolute bottom-0 right-0 bg-green-500 text-white px-2 py-1 text-xs font-bold rounded-tl-lg">
            ↑ Più alto
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h2 className="font-bold text-base leading-tight mb-2 line-clamp-2">{movie.title}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">{movie.overview}</p>

        {/* Rating text below — only on reveal */}
        {isRevealed && (
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
            <span className="text-xs text-gray-400">Voto TMDB</span>
            <span className={`text-2xl font-black tabular-nums ${ratingColor}`}>
              {movie.rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HigherOrLowerPage() {
  const [phase, setPhase] = useState<Phase>('start');
  const [pair, setPair]   = useState<MoviePair | null>(null);
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<Guess | null>(null);
  const [winner, setWinner]     = useState<Winner | null>(null);
  const [movieMode, setMovieMode] = useState<'popular' | 'any'>('popular');
  const [error, setError] = useState('');
  const [advancing, setAdvancing] = useState(false);

  const loadPair = useCallback(async (mode?: 'popular' | 'any') => {
    setPhase('loading');
    setSelected(null);
    setWinner(null);
    setAdvancing(false);
    setError('');
    try {
      const data = await getMoviePair(mode ?? movieMode);
      setPair(data);
      setPhase('playing');
    } catch {
      setError('Errore nel caricamento dei film. Riprova.');
      setPhase(lives > 0 ? 'playing' : 'gameover');
    }
  }, [movieMode, lives]);

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
    if (movieA.rating > movieB.rating) w = 'A';
    else if (movieB.rating > movieA.rating) w = 'B';
    else w = 'tie';

    setWinner(w);

    const correct = w === 'tie' || w === guess;
    const newLives = correct ? lives : lives - 1;
    const newScore = correct ? score + 1 : score;

    setLives(newLives);
    setScore(newScore);
    setPhase('reveal');

    if (newLives <= 0) {
      setTimeout(() => setPhase('gameover'), 2200);
    }
  };

  const handleNext = () => {
    if (advancing) return;
    setAdvancing(true);
    loadPair();
  };

  const revealMessage = () => {
    if (!selected || !winner) return '';
    const correct = winner === 'tie' || winner === selected;
    if (winner === 'tie') return '🟡 Pareggio! Punto bonus!';
    return correct ? '✅ Corretto!' : '❌ Sbagliato!';
  };

  const ratingDiff = pair
    ? Math.abs(pair.movieA.rating - pair.movieB.rating).toFixed(1)
    : '—';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ChevronUp className="w-6 h-6 text-green-500" />
          <ChevronDown className="w-6 h-6 text-red-500" />
          Higher or Lower
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Scegli il film con il voto TMDB più alto. 3 vite. Fino a quando riesci.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl">
          {error}
        </div>
      )}

      {/* ── START ── */}
      {phase === 'start' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center space-y-6">
          <div className="flex items-center justify-center gap-3 mx-auto">
            <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center">
              <ChevronUp className="w-8 h-8 text-green-500" />
            </div>
            <div className="w-8 h-8 text-gray-300 dark:text-gray-700 flex items-center justify-center font-black text-lg">VS</div>
            <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center">
              <ChevronDown className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Quale film ha il voto più alto?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Ti mostreremo due film. Clicca quello che pensi abbia il voto TMDB più alto.
              Hai <strong>3 vite</strong> — sbagli? Una vita in meno. Riesci ad arrivare a 10?
            </p>
          </div>

          {/* Mode toggle */}
          <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setMovieMode('popular')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                movieMode === 'popular'
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Flame className="w-4 h-4" /> Film famosi
            </button>
            <button
              onClick={() => setMovieMode('any')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-l border-gray-200 dark:border-gray-700 ${
                movieMode === 'any'
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Shuffle className="w-4 h-4" /> Casuali
            </button>
          </div>

          <button
            onClick={handleStart}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            <ChevronUp className="w-5 h-5" />
            Inizia
          </button>
        </div>
      )}

      {/* ── LOADING ── */}
      {phase === 'loading' && (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* ── PLAYING / REVEAL ── */}
      {(phase === 'playing' || phase === 'reveal') && pair && (
        <div className="space-y-4">
          {/* HUD: lives + score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: MAX_LIVES }).map((_, i) => (
                <Heart
                  key={i}
                  className={`w-6 h-6 transition-all duration-300 ${
                    i < lives
                      ? 'text-red-500 fill-red-500'
                      : 'text-gray-300 dark:text-gray-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              {phase === 'playing' && (
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  Quale ha il voto più alto?
                </span>
              )}
              {phase === 'reveal' && winner && (
                <span className={`text-sm font-semibold ${
                  winner === 'tie' ? 'text-yellow-500' :
                  (winner === selected) ? 'text-green-500' : 'text-red-500'
                }`}>
                  {revealMessage()}
                </span>
              )}
              <div className="bg-primary/10 text-primary rounded-xl px-4 py-1.5 font-black text-xl tabular-nums">
                {score}
              </div>
            </div>
          </div>

          {/* Movie cards */}
          <div className="flex gap-4 items-stretch">
            <MovieCard
              movie={pair.movieA}
              side="A"
              phase={phase}
              selected={selected}
              winner={winner}
              guess={selected}
              onPick={handlePick}
            />

            {/* VS divider */}
            <div className="flex flex-col items-center justify-center gap-3 flex-shrink-0 w-12">
              <div className="flex-1 w-px bg-gray-200 dark:bg-gray-700" />
              {phase === 'reveal' && winner === 'tie' ? (
                <div className="w-10 h-10 rounded-full bg-yellow-500/10 border-2 border-yellow-400 flex items-center justify-center">
                  <Minus className="w-4 h-4 text-yellow-500" />
                </div>
              ) : phase === 'reveal' && winner ? (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black ${
                  winner === 'A' ? 'bg-green-500/10 border-2 border-green-400 text-green-500' : 'bg-green-500/10 border-2 border-green-400 text-green-500'
                }`}>
                  <ChevronUp className={`w-5 h-5 ${winner === 'A' ? 'rotate-[0deg]' : 'rotate-180'}`} />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs font-black text-gray-400">
                  VS
                </div>
              )}
              {phase === 'reveal' && (
                <div className="text-center">
                  <div className="text-xs text-gray-400 dark:text-gray-600">diff</div>
                  <div className="text-sm font-bold text-gray-500 dark:text-gray-400 tabular-nums">{ratingDiff}</div>
                </div>
              )}
              <div className="flex-1 w-px bg-gray-200 dark:bg-gray-700" />
            </div>

            <MovieCard
              movie={pair.movieB}
              side="B"
              phase={phase}
              selected={selected}
              winner={winner}
              guess={selected}
              onPick={handlePick}
            />
          </div>

          {/* Reveal CTA */}
          {phase === 'reveal' && lives > 0 && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleNext}
                disabled={advancing}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3 rounded-xl transition-colors disabled:opacity-60"
              >
                <Film className="w-4 h-4" />
                {advancing ? 'Caricamento…' : 'Prossima coppia'}
              </button>
            </div>
          )}

          {phase === 'reveal' && lives <= 0 && (
            <div className="text-center pt-2 text-sm text-gray-400 dark:text-gray-600">
              Game over… calcolo risultato…
            </div>
          )}
        </div>
      )}

      {/* ── GAME OVER ── */}
      {phase === 'gameover' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center space-y-6">
          <div className="text-5xl">
            {score >= 15 ? '🏆' : score >= 10 ? '🌟' : score >= 5 ? '🎬' : '💀'}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Punteggio finale</p>
            <p className={`text-8xl font-black tabular-nums ${scoreColor(score)}`}>{score}</p>
            <p className="text-sm text-gray-400 mt-1">risposte esatte</p>
          </div>

          <div className="inline-block bg-gray-50 dark:bg-gray-800 rounded-xl px-6 py-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {score >= 15 ? 'Sei un critico cinematografico nato!' :
               score >= 10 ? 'Ottima conoscenza del cinema!' :
               score >= 5  ? 'Niente male, puoi fare di meglio!' :
               score >= 1  ? 'Ci vuole un po\' di pratica!' :
               'Meglio la prossima volta!'}
            </p>
          </div>

          {/* Hearts used */}
          <div className="flex justify-center gap-2">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <Heart key={i} className="w-7 h-7 text-gray-300 dark:text-gray-700" />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleStart}
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              <ChevronUp className="w-5 h-5" />
              Riprova
            </button>
            <button
              onClick={() => setPhase('start')}
              className="inline-flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium px-6 py-3 rounded-xl transition-colors"
            >
              Menu principale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
