import { useState } from 'react';
import { useFriends } from '../context/FriendsContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { Users, UserMinus, Check, X, MessageCircle, Loader2, UserCheck } from 'lucide-react';

export default function FriendsPage() {
  const { friends, friendIds, pendingRequests, loading, accept, remove, refresh } = useFriends();
  const { onlineUsers } = useSocket();
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const onlineIds = new Set(onlineUsers.map((u) => u.id));

  const handleAccept = async (requestId: number) => {
    setActionLoading(requestId);
    try { await accept(requestId); } finally { setActionLoading(null); }
  };

  const handleReject = async (requestId: number) => {
    setActionLoading(requestId);
    try { await remove(requestId); } finally { setActionLoading(null); }
  };

  const handleRemoveFriend = async (friendId: number) => {
    // Find the FriendRequest ID — not directly available here; reload from refresh
    // We use deleteFriendRequest but need the request id. FriendsContext doesn't expose it
    // directly for friends. Use remove from context with userId — but remove() takes requestId.
    // Workaround: call refresh and look up; simpler is to just navigate to ranking or handle in context.
    // For now we just surface the issue — this will require a status lookup.
    // Instead: call getFriendStatus here to get requestId then delete.
    const { getFriendStatus, deleteFriendRequest } = await import('../lib/api');
    const st = await getFriendStatus(friendId);
    if (st.requestId) {
      setActionLoading(friendId);
      try { await deleteFriendRequest(st.requestId); await refresh(); } finally { setActionLoading(null); }
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
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Amici
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gestisci le tue amicizie e le richieste in arrivo
        </p>
      </div>

      {/* ── Pending requests ──────────────────────────────────────────────── */}
      {pendingRequests.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Richieste ricevute ({pendingRequests.length})
          </h2>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-primary/20 px-4 py-3 flex items-center gap-4"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {req.sender?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{req.sender?.username}</p>
                  <p className="text-xs text-gray-400">vuole essere tuo amico</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleAccept(req.id)}
                    disabled={actionLoading === req.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Accetta
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={actionLoading === req.id}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Rifiuta
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Friends list ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          I tuoi amici ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Nessun amico ancora</p>
            <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">
              Cerca giocatori nella <button onClick={() => navigate('/ranking')} className="text-primary hover:underline">Classifica</button> e invia una richiesta
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => {
              const isOnline = onlineIds.has(f.id);
              return (
                <div
                  key={f.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-4 hover:shadow-sm transition-shadow"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{f.username.charAt(0).toUpperCase()}</span>
                    </div>
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{f.username}</p>
                    <p className={`text-xs ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                      {isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isOnline && (
                      <button
                        onClick={() => navigate('/chat')}
                        title="Manda un messaggio"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveFriend(f.id)}
                      disabled={actionLoading === f.id}
                      title="Rimuovi amico"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-xs text-center text-gray-400 dark:text-gray-600">
        Aggiungi amici dalla <button onClick={() => navigate('/ranking')} className="text-primary hover:underline">Classifica</button>
      </p>
    </div>
  );
}
