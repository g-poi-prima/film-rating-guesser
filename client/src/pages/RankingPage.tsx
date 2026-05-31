import { useState, useEffect } from 'react';
import { getRanking, getFriendStatus, sendFriendRequest, acceptFriendRequest, deleteFriendRequest } from '../lib/api';
import { useFriends } from '../context/FriendsContext';
import { useAuth } from '../context/AuthContext';
import type { RankingEntry, FriendStatusResult } from '../types';
import UserAvatar from '../components/UserAvatar';
import { Trophy, Star, Gamepad2, UserPlus, Check, Clock, UserMinus } from 'lucide-react';

const medals = ['🥇', '🥈', '🥉'];

export default function RankingPage() {
  const { user } = useAuth();
  const { refresh: refreshFriends } = useFriends();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [statuses, setStatuses] = useState<Record<number, FriendStatusResult>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    getRanking()
      .then(async (data) => {
        setRanking(data);
        // Fetch friend status for every entry that isn't the logged-in user
        const others = data.filter((e) => e.id !== user?.id);
        const results = await Promise.all(others.map((e) => getFriendStatus(e.id).catch(() => ({ status: null as null }))));
        const map: Record<number, FriendStatusResult> = {};
        others.forEach((e, i) => { map[e.id] = results[i] ?? { status: null }; });
        setStatuses(map);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleFriendAction = async (entry: RankingEntry) => {
    setActionLoading(entry.id);
    try {
      const st = statuses[entry.id];
      if (!st || st.status === null) {
        await sendFriendRequest(entry.id);
        setStatuses((prev) => ({ ...prev, [entry.id]: { status: 'request_sent' } }));
      } else if (st.status === 'request_received' && st.requestId) {
        await acceptFriendRequest(st.requestId);
        setStatuses((prev) => ({ ...prev, [entry.id]: { status: 'friends', requestId: st.requestId } }));
        await refreshFriends();
      } else if ((st.status === 'friends' || st.status === 'request_sent') && st.requestId) {
        await deleteFriendRequest(st.requestId);
        setStatuses((prev) => ({ ...prev, [entry.id]: { status: null } }));
        if (st.status === 'friends') await refreshFriends();
      }
    } catch {
      // silently ignore errors (e.g. duplicate request)
    } finally {
      setActionLoading(null);
    }
  };

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
          Media su tutte le partite: solo e 1v1
        </p>
      </div>

      {ranking.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center text-gray-500">
          Nessun punteggio ancora. Sii il primo a giocare!
        </div>
      ) : (
        <div className="space-y-2">
          {ranking.map((entry, index) => {
            const isMe = entry.id === user?.id;
            const st = statuses[entry.id];

            let FriendBtn: React.ReactNode = null;
            if (!isMe && st !== undefined) {
              if (st.status === null) {
                FriendBtn = (
                  <button onClick={() => handleFriendAction(entry)} disabled={actionLoading === entry.id} title="Aggiungi amico" className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-40">
                    <UserPlus className="w-4 h-4" />
                  </button>
                );
              } else if (st.status === 'request_sent') {
                FriendBtn = (
                  <button onClick={() => handleFriendAction(entry)} disabled={actionLoading === entry.id} title="Richiesta inviata — annulla" className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-40">
                    <Clock className="w-4 h-4" />
                  </button>
                );
              } else if (st.status === 'request_received') {
                FriendBtn = (
                  <button onClick={() => handleFriendAction(entry)} disabled={actionLoading === entry.id} title="Accetta richiesta" className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-40">
                    <Check className="w-4 h-4" />
                  </button>
                );
              } else if (st.status === 'friends') {
                FriendBtn = (
                  <button onClick={() => handleFriendAction(entry)} disabled={actionLoading === entry.id} title="Rimuovi amico" className="p-1.5 rounded-lg text-primary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40">
                    <UserMinus className="w-4 h-4" />
                  </button>
                );
              }
            }

            return (
              <div
                key={entry.id}
                className={`bg-white dark:bg-gray-900 rounded-2xl border transition-shadow hover:shadow-md flex items-center gap-4 px-5 py-4 ${
                  index === 0
                    ? 'border-yellow-200 dark:border-yellow-800 shadow-sm'
                    : 'border-gray-200 dark:border-gray-800'
                } ${isMe ? 'ring-2 ring-primary/30' : ''}`}
              >
                {/* Rank */}
                <div className="w-8 text-center flex-shrink-0">
                  {index < 3 ? (
                    <span className="text-xl">{medals[index]}</span>
                  ) : (
                    <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <UserAvatar username={entry.username} avatar={entry.avatar} />

                {/* Name + stats */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{entry.username}</p>
                    {isMe && <span className="text-xs text-primary font-medium">(tu)</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Gamepad2 className="w-3 h-3" />
                      {entry.gamesPlayed}s·{entry.matchRoundsPlayed}m
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      media {entry.averageScore}
                    </span>
                  </div>
                </div>

                {/* Friend button */}
                {FriendBtn}

                {/* Score */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-black text-primary tabular-nums">{entry.totalScore}</p>
                  <p className="text-xs text-gray-400">punti</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
