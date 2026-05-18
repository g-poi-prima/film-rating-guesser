import { useState, useEffect } from 'react';
import { getRanking } from '../lib/api';
import type { RankingEntry } from '../types';
import { Trophy, Star, Gamepad2 } from 'lucide-react';

const medals = ['🥇', '🥈', '🥉'];

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRanking()
      .then(setRanking)
      .finally(() => setLoading(false));
  }, []);

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
          <Trophy className="w-6 h-6 text-yellow-500" />
          Classifica
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          I migliori giocatori di FilmRatingGuessr
        </p>
      </div>

      {ranking.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center text-gray-500">
          Nessun punteggio ancora. Sii il primo a giocare!
        </div>
      ) : (
        <div className="space-y-2">
          {ranking.map((entry, index) => (
            <div
              key={entry.id}
              className={`bg-white dark:bg-gray-900 rounded-2xl border transition-shadow hover:shadow-md flex items-center gap-4 px-5 py-4 ${
                index === 0
                  ? 'border-yellow-200 dark:border-yellow-800 shadow-sm'
                  : 'border-gray-200 dark:border-gray-800'
              }`}
            >
              {/* Rank */}
              <div className="w-8 text-center flex-shrink-0">
                {index < 3 ? (
                  <span className="text-xl">{medals[index]}</span>
                ) : (
                  <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                )}
              </div>

              {/* Avatar placeholder */}
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">
                  {entry.username.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Name + stats */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{entry.username}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Gamepad2 className="w-3 h-3" />
                    {entry.gamesPlayed} partite
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    media {entry.averageScore}
                  </span>
                </div>
              </div>

              {/* Score */}
              <div className="text-right flex-shrink-0">
                <p className="text-xl font-black text-primary tabular-nums">{entry.totalScore}</p>
                <p className="text-xs text-gray-400">punti</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
