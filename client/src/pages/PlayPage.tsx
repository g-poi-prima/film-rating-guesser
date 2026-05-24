import { useState, useCallback } from 'react';
import { getRandomMovie, submitGuess } from '../lib/api';
import type { RandomMovie, GuessResult } from '../types';
import { Film, Star, RefreshCw, PlayCircle, Flame, Shuffle } from 'lucide-react';

type MovieMode = 'popular' | 'any';

export default function PlayPage() {
  const [movie, setMovie] = useState<RandomMovie | null>(null);
  const [loading, setLoading] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [result, setResult] = useState<GuessResult | null>(null);
  const [movieMode, setMovieMode] = useState<MovieMode>('popular');
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState('');

  const fetchMovie = useCallback(async (mode?: MovieMode) => {
    setLoading(true);
    setError('');
    setResult(null);
    setShowResult(false);
    setUserRating(5);
    try {
      setMovie(await getRandomMovie(mode ?? movieMode));
    } catch {
      setError('Errore nel caricamento del film. Riprova.');
    } finally {
      setLoading(false);
    }
  }, [movieMode]);

  const handleGuess = async () => {
    if (!movie) return;
    setLoading(true);
    setError('');
    try {
      const data = await submitGuess({
        movieId: movie.id,
        movieTitle: movie.title,
        moviePoster: movie.poster,
        movieOverview: movie.overview,
        userRating,
      });
      setResult(data);
      setShowResult(true);
    } catch {
      setError("Errore nell'invio del voto. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-green-500' : s >= 60 ? 'text-yellow-500' : s >= 40 ? 'text-orange-500' : 'text-red-500';

  const scoreBorder = (s: number) =>
    s >= 80
      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
      : s >= 60
      ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
      : s >= 40
      ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20'
      : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Film className="w-6 h-6 text-primary" />
          Indovina il Rating
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Guarda il film e indovina il suo voto su TMDB
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Start screen */}
      {!movie && !loading && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <Film className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">Pronto a giocare?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
              Ti mostreremo un film: dai un voto e scopri quanto sei vicino al rating reale su TMDB
            </p>
          </div>

          {/* Film mode toggle */}
          <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setMovieMode('popular')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                movieMode === 'popular'
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Flame className="w-4 h-4" />
              Film famosi
            </button>
            <button
              onClick={() => setMovieMode('any')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-l border-gray-200 dark:border-gray-700 ${
                movieMode === 'any'
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Shuffle className="w-4 h-4" />
              Casuali
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-600 -mt-3">
            {movieMode === 'popular'
              ? 'Film con almeno 1 000 voti su TMDB — riconoscibili dalla maggior parte dei giocatori'
              : 'Qualsiasi film dal catalogo TMDB — potrebbe essere molto oscuro'}
          </p>

          <button
            onClick={() => fetchMovie()}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            <PlayCircle className="w-5 h-5" />
            Inizia
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && !showResult && (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Movie card */}
      {movie && !showResult && !loading && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="flex flex-col md:flex-row">
            {/* Poster */}
            <div className="md:w-64 lg:w-72 flex-shrink-0 bg-gray-100 dark:bg-gray-800">
              {movie.poster ? (
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-64 md:h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                  <Film className="w-16 h-16" />
                </div>
              )}
            </div>

            {/* Info + rating */}
            <div className="flex-1 p-6 flex flex-col">
              <div className="flex-1">
                <h2 className="text-xl font-bold leading-snug mb-3">{movie.title}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-6">
                  {movie.overview}
                </p>
              </div>

              <div className="mt-8 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Il tuo voto</span>
                    <span className="text-3xl font-black text-primary tabular-nums">{userRating}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={userRating}
                    onChange={(e) => setUserRating(parseFloat(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1.5 px-0.5">
                    <span>0</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>

                <button
                  onClick={handleGuess}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Star className="w-4 h-4" />
                  Conferma voto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {showResult && result && (
        <div className="space-y-4">
          {/* Score */}
          <div className={`rounded-2xl border p-8 text-center ${scoreBorder(result.score)}`}>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Punteggio ottenuto</p>
            <p className={`text-7xl font-black tabular-nums ${scoreColor(result.score)}`}>{result.score}</p>
            <p className="text-sm text-gray-400 mt-1">/ 100 punti</p>
          </div>

          {/* Comparison */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="flex flex-col md:flex-row">
              {movie?.poster && (
                <div className="md:w-40 flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                  <img src={movie.poster} alt={movie?.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 p-6">
                <h2 className="font-bold text-lg mb-4">{movie?.title}</h2>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">Il tuo voto</p>
                    <p className="text-2xl font-bold text-primary">{result.game.userRating}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">Differenza</p>
                    <p className="text-2xl font-bold">{result.diff.toFixed(1)}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">Voto reale</p>
                    <p className="text-2xl font-bold text-secondary">{result.realRating.toFixed(1)}</p>
                  </div>
                </div>
                <button
                  onClick={() => fetchMovie()}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-xl transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Prossimo film
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
