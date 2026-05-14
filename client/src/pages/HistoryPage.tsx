import { useState, useEffect } from 'react';
import { getHistory } from '../lib/api';
import type { Game } from '../types';
import { History, Star, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export default function HistoryPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getHistory(page).then((data) => { setGames(data.games); setTotalPages(data.totalPages); }).finally(() => setLoading(false));
  }, [page]);

  const getScoreColor = (s: number) => s >= 80 ? 'text-green-500' : s >= 60 ? 'text-yellow-500' : s >= 40 ? 'text-orange-500' : 'text-red-500';

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="text-center mb-8"><h1 className="text-3xl font-bold flex items-center justify-center gap-2"><History className="w-8 h-8 text-primary" />Storico Partite</h1></div>
      {games.length === 0 && <div className="text-center py-12 text-gray-500"><p>Nessuna partita giocata. Inizia a giocare!</p></div>}
      <div className="space-y-3">
        {games.map((game) => (
          <div key={game.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-4">
            {game.moviePoster && <img src={game.moviePoster} alt={game.movieTitle} className="w-16 h-24 object-cover rounded-lg flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{game.movieTitle}</p>
              <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1"><Star className="w-3 h-3" />Tu: {game.userRating} | Reale: {game.realRating.toFixed(1)}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(game.createdAt).toLocaleDateString('it-IT')}</span>
              </div>
            </div>
            <div className="text-right"><p className={`text-xl font-bold ${getScoreColor(game.score)}`}>{game.score}</p><p className="text-xs text-gray-400">punti</p></div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm disabled:opacity-50"><ChevronLeft className="w-4 h-4" />Precedente</button>
          <span className="text-sm text-gray-500">Pagina {page} di {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm disabled:opacity-50">Successiva<ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}