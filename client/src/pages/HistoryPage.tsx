import { useState, useEffect } from 'react';
import { getHistory } from '../lib/api';
import type { Game } from '../types';
import { History, Star, Calendar, ChevronLeft, ChevronRight, Film } from 'lucide-react';

export default function HistoryPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getHistory(page)
      .then((data) => {
        setGames(data.games);
        setTotalPages(data.totalPages);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-green-500' : s >= 60 ? 'text-yellow-500' : s >= 40 ? 'text-orange-500' : 'text-red-500';

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="w-6 h-6 text-primary" />
          Storico partite
        </h1>
      </div>

      {games.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center text-gray-500">
          Nessuna partita giocata. Inizia a giocare!
        </div>
      ) : (
        <div className="space-y-2">
          {games.map((game) => (
            <div
              key={game.id}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center gap-4 px-4 py-3 hover:shadow-sm transition-shadow"
            >
              {game.moviePoster ? (
                <img
                  src={game.moviePoster}
                  alt={game.movieTitle}
                  className="w-12 h-16 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Film className="w-5 h-5 text-gray-400" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{game.movieTitle}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Tu: <strong className="text-gray-600 dark:text-gray-300">{game.userRating}</strong>
                    &nbsp;·&nbsp;Reale: <strong className="text-gray-600 dark:text-gray-300">{game.realRating.toFixed(1)}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(game.createdAt).toLocaleDateString('it-IT')}
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className={`text-xl font-black tabular-nums ${scoreColor(game.score)}`}>{game.score}</p>
                <p className="text-xs text-gray-400">pt</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Precedente
          </button>
          <span className="text-sm text-gray-500 tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            Successiva
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
