import { useState, useCallback } from 'react';
import { getRandomMovie, submitGuess } from '../lib/api';
import type { RandomMovie, GuessResult } from '../types';
import { Film, Star, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function PlayPage() {
  const [movie, setMovie] = useState<RandomMovie | null>(null);
  const [loading, setLoading] = useState(false);
  const [userRating, setUserRating] = useState<number>(5);
  const [result, setResult] = useState<GuessResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState('');

  const fetchMovie = useCallback(async () => {
    setLoading(true); setError(''); setResult(null); setShowResult(false); setUserRating(5);
    try { setMovie(await getRandomMovie()); }
    catch { setError('Errore nel caricamento del film. Riprova.'); }
    finally { setLoading(false); }
  }, []);

  const handleGuess = async () => {
    if (!movie) return; setLoading(true); setError('');
    try {
      const data = await submitGuess({ movieId: movie.id, movieTitle: movie.title, moviePoster: movie.poster, movieOverview: movie.overview, userRating, realRating: 0 });
      setResult(data); setShowResult(true);
    } catch { setError("Errore nell'invio del voto. Riprova."); }
    finally { setLoading(false); }
  };

  const getScoreColor = (s: number) => s >= 80 ? 'text-green-500' : s >= 60 ? 'text-yellow-500' : s >= 40 ? 'text-orange-500' : 'text-red-500';
  const getDiffIcon = (d: number) => d <= 0.5 ? <TrendingUp className="w-6 h-6 text-green-500" /> : d <= 2 ? <Minus className="w-6 h-6 text-yellow-500" /> : <TrendingDown className="w-6 h-6 text-red-500" />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Film className="w-8 h-8 text-primary" />Indovina il Rating!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Dai un voto al film e scopri quanto sei vicino al rating reale</p>
      </div>
      {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}
      {!movie && !loading && (
        <div className="text-center py-12">
          <button onClick={fetchMovie} className="inline-flex items-center gap-2 bg-primary text-white font-medium px-6 py-3 rounded-lg text-lg">
            <Film className="w-5 h-5" />Inizia a giocare!
          </button>
        </div>
      )}
      {loading && !result && <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" /></div>}
      {movie && !showResult && !loading && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          {movie.poster && <img src={movie.poster} alt={movie.title} className="w-full h-80 object-cover" />}
          <div className="p-6 space-y-4">
            <h2 className="text-2xl font-bold">{movie.title}</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{movie.overview}</p>
            <div>
              <label className="block text-sm font-medium mb-2">Il tuo voto: <span className="text-primary font-bold">{userRating}</span>/10</label>
              <input type="range" min="0" max="10" step="0.5" value={userRating} onChange={(e) => setUserRating(parseFloat(e.target.value))} className="w-full accent-primary" />
            </div>
            <button onClick={handleGuess} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-primary text-white font-medium py-3 rounded-lg disabled:opacity-50">
              <Star className="w-5 h-5" />{loading ? 'Calcolo...' : 'Conferma voto!'}
            </button>
          </div>
        </div>
      )}
      {showResult && result && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">{movie?.title}</h2>
            <div className="flex items-center justify-center gap-2 text-lg">{getDiffIcon(result.diff)}<span>Differenza: {result.diff.toFixed(1)}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"><p className="text-sm text-gray-500">Il tuo voto</p><p className="text-3xl font-bold text-primary">{result.game.userRating}</p></div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"><p className="text-sm text-gray-500">Voto reale</p><p className="text-3xl font-bold text-secondary">{result.realRating.toFixed(1)}</p></div>
          </div>
          <div className="text-center"><p className="text-sm text-gray-500 mb-1">Punteggio</p><p className={`text-5xl font-bold ${getScoreColor(result.score)}`}>{result.score}</p></div>
          <button onClick={fetchMovie} className="w-full flex items-center justify-center gap-2 bg-primary text-white font-medium py-3 rounded-lg">
            <RefreshCw className="w-5 h-5" />Prossimo film
          </button>
        </div>
      )}
    </div>
  );
}