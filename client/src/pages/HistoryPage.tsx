import { useState, useEffect } from 'react';
import { getHistory, getMatchHistory } from '../lib/api';
import type { Game, MatchHistory } from '../types';
import { History, Star, Calendar, ChevronLeft, ChevronRight, Film, Swords, User, ChevronDown, ChevronUp } from 'lucide-react';

type Tab = 'solo' | 'match';

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>('solo');

  // Solo games state
  const [games, setGames] = useState<Game[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [soloLoading, setSoloLoading] = useState(true);

  // Match history state
  const [matches, setMatches] = useState<MatchHistory[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchFetched, setMatchFetched] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);

  useEffect(() => {
    setSoloLoading(true);
    getHistory(page)
      .then((data) => { setGames(data.games); setTotalPages(data.totalPages); })
      .finally(() => setSoloLoading(false));
  }, [page]);

  useEffect(() => {
    if (tab !== 'match' || matchFetched) return;
    setMatchLoading(true);
    getMatchHistory()
      .then((data) => { setMatches(data); setMatchFetched(true); })
      .finally(() => setMatchLoading(false));
  }, [tab, matchFetched]);

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-green-500' : s >= 55 ? 'text-yellow-500' : s >= 30 ? 'text-orange-500' : 'text-red-500';

  const matchResult = (m: MatchHistory) => {
    if (m.status === 'CANCELLED') return { label: 'Annullata', color: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' };
    if (m.myTotalScore === null || m.opponentTotalScore === null) return { label: '—', color: 'bg-gray-100 dark:bg-gray-800 text-gray-500' };
    if (m.myTotalScore > m.opponentTotalScore) return { label: 'Vittoria', color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' };
    if (m.myTotalScore < m.opponentTotalScore) return { label: 'Sconfitta', color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' };
    return { label: 'Pareggio', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' };
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="w-6 h-6 text-primary" />
          Storico partite
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        <button
          onClick={() => setTab('solo')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'solo'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Film className="w-4 h-4" />
          Partite Solo
        </button>
        <button
          onClick={() => setTab('match')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'match'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Swords className="w-4 h-4" />
          Partite 1v1
        </button>
      </div>

      {/* ── Solo tab ─────────────────────────────────────────────────────── */}
      {tab === 'solo' && (
        <>
          {soloLoading ? (
            <div className="flex justify-center py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
            </div>
          ) : games.length === 0 ? (
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
              <span className="text-sm text-gray-500 tabular-nums">{page} / {totalPages}</span>
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
        </>
      )}

      {/* ── 1v1 tab ──────────────────────────────────────────────────────── */}
      {tab === 'match' && (
        <>
          {matchLoading ? (
            <div className="flex justify-center py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
            </div>
          ) : matches.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center text-gray-500">
              Nessuna partita 1v1. Vai su <strong>1v1</strong> per sfidare qualcuno!
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((m) => {
                const res = matchResult(m);
                const isExpanded = expandedMatch === m.id;
                return (
                  <div
                    key={m.id}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
                  >
                    {/* Match header */}
                    <button
                      onClick={() => setExpandedMatch(isExpanded ? null : m.id)}
                      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          vs {m.opponent?.username ?? 'Sconosciuto'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <span>{m.roundsPlayed}/{m.totalRounds} round</span>
                          <span>·</span>
                          <span>{new Date(m.createdAt).toLocaleDateString('it-IT')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {m.myTotalScore !== null && (
                          <div className="text-right">
                            <p className="text-sm font-bold text-primary">{m.myTotalScore} pt</p>
                            <p className="text-xs text-gray-400">{m.opponentTotalScore} avv.</p>
                          </div>
                        )}
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${res.color}`}>
                          {res.label}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>

                    {/* Round details */}
                    {isExpanded && m.rounds.length > 0 && (
                      <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                        {m.rounds.map((r) => (
                          <div key={r.roundNumber} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                            <span className="text-gray-400 font-bold w-5">{r.roundNumber}</span>
                            <span className="flex-1 truncate text-gray-600 dark:text-gray-300 font-medium">{r.movieTitle}</span>
                            <span className="text-gray-400">Reale {r.realRating.toFixed(1)}</span>
                            <span className="text-gray-500 dark:text-gray-400">Tu {r.myRating?.toFixed(1) ?? '—'}</span>
                            <span className={`font-bold w-12 text-right ${scoreColor(r.myScore ?? 0)}`}>
                              {r.myScore ?? 0} pt
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
