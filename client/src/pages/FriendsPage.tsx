import { useState, useEffect, useRef } from 'react';
import { useFriends } from '../context/FriendsContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { searchUsers, sendFriendRequest } from '../lib/api';
import { Users, UserMinus, Check, X, MessageCircle, Loader2, UserCheck, UserPlus, Search } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';

export default function FriendsPage() {
  const { friends, friendIds, pendingRequests, loading, accept, remove, refresh } = useFriends();
  const { onlineUsers } = useSocket();
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // ── Add-friend search ──────────────────────────────────────────────────────
  const [addQuery, setAddQuery]           = useState('');
  const [addResults, setAddResults]       = useState<{ id: number; username: string; avatar: string | null }[]>([]);
  const [addSearching, setAddSearching]   = useState(false);
  const [addSent, setAddSent]             = useState<Set<number>>(new Set());
  const addDebounce                       = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (addDebounce.current) clearTimeout(addDebounce.current);
    if (addQuery.trim().length === 0) { setAddResults([]); return; }
    addDebounce.current = setTimeout(async () => {
      setAddSearching(true);
      try { setAddResults(await searchUsers(addQuery.trim())); }
      catch { setAddResults([]); }
      finally { setAddSearching(false); }
    }, 350);
    return () => { if (addDebounce.current) clearTimeout(addDebounce.current); };
  }, [addQuery]);

  const handleSendRequest = async (userId: number) => {
    setActionLoading(userId);
    try {
      await sendFriendRequest(userId);
      setAddSent((s) => new Set(s).add(userId));
    } catch { /* already sent or other error */ }
    finally { setActionLoading(null); }
  };

  // ── Friends filter ─────────────────────────────────────────────────────────
  const [filterQuery, setFilterQuery] = useState('');

  const onlineIds = new Set(onlineUsers.map((u) => u.id));
  const filteredFriends = filterQuery.trim()
    ? friends.filter((f) => f.username.toLowerCase().includes(filterQuery.toLowerCase()))
    : friends;

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

      {/* ── Add friend ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Aggiungi amico
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={addQuery}
            onChange={(e) => setAddQuery(e.target.value)}
            placeholder="Cerca per username, email o ID…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {addSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
        </div>
        {addResults.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {addResults.map((u) => {
              const alreadyFriend = friends.some((f) => f.id === u.id);
              const sent = addSent.has(u.id);
              return (
                <div key={u.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-2.5 flex items-center gap-3">
                  <UserAvatar username={u.username} avatar={u.avatar} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{u.username}</p>
                    <p className="text-xs text-gray-400">ID {u.id}</p>
                  </div>
                  <button
                    onClick={() => handleSendRequest(u.id)}
                    disabled={alreadyFriend || sent || actionLoading === u.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50
                      bg-primary/10 text-primary hover:bg-primary hover:text-white disabled:hover:bg-primary/10 disabled:hover:text-primary"
                  >
                    {actionLoading === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                    {alreadyFriend ? 'Già amici' : sent ? 'Inviata' : 'Aggiungi'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {addQuery.trim().length > 0 && !addSearching && addResults.length === 0 && (
          <p className="mt-2 text-sm text-gray-400 text-center py-3">Nessun utente trovato</p>
        )}
      </section>

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
                <UserAvatar username={req.sender?.username ?? '?'} avatar={req.sender?.avatar} />
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
            <Users className="w-4 h-4" />
            I tuoi amici ({friends.length})
          </h2>
        </div>
        {friends.length > 0 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filtra amici…"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        )}
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
            {filteredFriends.length === 0 && filterQuery && (
              <p className="text-sm text-gray-400 text-center py-4">Nessun amico trovato per "{filterQuery}"</p>
            )}
            {filteredFriends.map((f) => {
              const isOnline = onlineIds.has(f.id);
              return (
                <div
                  key={f.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-4 hover:shadow-sm transition-shadow"
                >
                  <div className="relative flex-shrink-0">
                    <UserAvatar username={f.username} avatar={f.avatar} />
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
        Puoi anche aggiungere amici dalla <button onClick={() => navigate('/ranking')} className="text-primary hover:underline">Classifica</button>
      </p>
    </div>
  );
}
