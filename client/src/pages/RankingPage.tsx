import { useState, useEffect } from 'react';
import { getRanking } from '../lib/api';
import type { RankingEntry } from '../types';
import { Trophy, Star, Gamepad2 } from 'lucide-react';

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getRanking().then(setRanking).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2"><Trophy className="w-8 h-8 text-yellow-500" />Classifica</h1>
      </div>
      <div className="space-y-3">
        {ranking.map((entry, index) => (
          <div key={entry.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-600' : index === 1 ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 text-gray-400'}`}>{index + 1}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{entry.username}</p>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1"><Gamepad2 className="w-3 h-3" />{entry.gamesPlayed} partite</span>
                <span className="flex items-center gap-1"><Star className="w-3 h-3" />Media: {entry.averageScore}</span>
              </div>
            </div>
            <div className="text-right"><p className="text-2xl font-bold text-primary">{entry.totalScore}</p><p className="text-xs text-gray-400">punti</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}