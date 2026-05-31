import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useLobby } from '../context/LobbyContext';
import { getOpenLobbies } from '../lib/api';
import type { LobbyPublic } from '../types';
import { Users, Trophy, RefreshCw, Plus, X, Flame, Shuffle, ArrowRight } from 'lucide-react';

export default function LobbiesPage() {
  const { socket } = useSocket();
  const { user } = useAuth();
  const { createLobby: ctxCreate, joinLobby: ctxJoin, phase, lobbyState, errorMsg } = useLobby();
  const isInLobby = lobbyState !== null && phase !== 'idle' && phase !== 'error';
  const [lobbies, setLobbies] = useState<LobbyPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    mode: 'ALL_VS_ALL' as 'ALL_VS_ALL' | 'TOURNAMENT',
    totalRounds: 5,
    filmMode: 'popular' as 'popular' | 'any',
  });
  const [joinCode, setJoinCode] = useState('');
  const [localError, setLocalError] = useState('');

  // Show context errors (e.g. lobby not found) in the page
  const error = errorMsg || localError;

  const load = () => {
    setLoading(true);
    getOpenLobbies()
      .then(setLobbies)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Refresh list when socket reconnects
  useEffect(() => {
    if (!socket) return;
    socket.on('lobby:list', load);
    return () => { socket.off('lobby:list', load); };
  }, [socket]);

  const createLobby = () => {
    if (!form.name.trim()) { setLocalError('Inserisci un nome per la lobby'); return; }
    setLocalError('');
    // LobbyContext handles navigation after lobby:state is received
    ctxCreate({ name: form.name.trim(), mode: form.mode, totalRounds: form.totalRounds, filmMode: form.filmMode });
  };

  const joinByCode = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) { setLocalError('Inserisci un codice lobby'); return; }
    setLocalError('');
    ctxJoin(code);
  };

  const joinLobby = (code: string) => {
    setLocalError('');
    ctxJoin(code);
  };

  void phase; // used by LobbyContext for state tracking

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Lobby personalizzate
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Partite con più giocatori — tutti contro tutti o torneo ad eliminazione
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" title="Aggiorna">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => { setShowCreate((v) => !v); setLocalError(''); }}
            disabled={isInLobby}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showCreate ? 'Annulla' : 'Crea lobby'}
          </button>
        </div>
      </div>

      {/* Already in lobby banner */}
      {isInLobby && lobbyState && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
            <div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">
                Sei già in una lobby — <span className="text-primary">{lobbyState.name}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Esci dalla lobby corrente prima di crearne o unirti a un'altra.
              </p>
            </div>
          </div>
          <Link
            to={`/lobby/${lobbyState.code}`}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline flex-shrink-0 ml-4"
          >
            Torna <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Create form */}
      {showCreate && !isInLobby && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Nuova lobby</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="es. Serata cinema"
                className="field"
                maxLength={40}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modalità</label>
              <div className="grid grid-cols-2 gap-3">
                {(['ALL_VS_ALL', 'TOURNAMENT'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setForm((f) => ({ ...f, mode: m }))}
                    className={`flex flex-col gap-1 p-3 rounded-xl border text-left transition-colors ${
                      form.mode === m
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="font-semibold text-sm">
                      {m === 'ALL_VS_ALL' ? '🏆 Tutti contro tutti' : '⚔️ Torneo eliminazione'}
                    </span>
                    <span className="text-xs opacity-70">
                      {m === 'ALL_VS_ALL'
                        ? 'Punteggio cumulativo, vince chi totalizza di più'
                        : 'Metà dei giocatori viene eliminata ogni round'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Film</label>
              <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {(['popular', 'any'] as const).map((fm) => (
                  <button
                    key={fm}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, filmMode: fm }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
                      form.filmMode === fm
                        ? 'bg-primary text-white'
                        : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    } ${fm === 'any' ? 'border-l border-gray-200 dark:border-gray-700' : ''}`}
                  >
                    {fm === 'popular' ? <Flame className="w-4 h-4" /> : <Shuffle className="w-4 h-4" />}
                    {fm === 'popular' ? 'Film famosi' : 'Casuali'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {form.filmMode === 'popular' ? '≥ 1 000 voti su TMDB — tutti riconoscibili' : 'Qualsiasi film dal catalogo TMDB'}
              </p>
            </div>

            {form.mode === 'ALL_VS_ALL' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Round: {form.totalRounds}
                </label>
                <input
                  type="range"
                  min={3} max={10} step={1}
                  value={form.totalRounds}
                  onChange={(e) => setForm((f) => ({ ...f, totalRounds: parseInt(e.target.value) }))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>3</span><span>10</span>
                </div>
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={createLobby}
            className="w-full py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Crea e unisciti
          </button>
        </div>
      )}

      {/* Join by code */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Codice lobby (es. ABC123)"
            className="field flex-1"
            maxLength={6}
            disabled={isInLobby}
          />
          <button
            onClick={joinByCode}
            disabled={isInLobby}
            className="px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Unisciti
          </button>
        </div>
        {!showCreate && error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>

      {/* Lobby list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
        </div>
      ) : lobbies.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nessuna lobby aperta al momento</p>
          <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">Creane una e invita i tuoi amici!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lobbies.map((lobby) => (
            <div
              key={lobby.code}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 px-5 py-4 flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{lobby.name}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                    lobby.mode === 'ALL_VS_ALL'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  }`}>
                    {lobby.mode === 'ALL_VS_ALL' ? 'Tutti vs tutti' : 'Torneo'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {lobby.playerCount} giocatori
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    {lobby.totalRounds} round
                  </span>
                  <span className="flex items-center gap-1">
                    {lobby.filmMode === 'popular'
                      ? <><Flame className="w-3 h-3 text-orange-400" />famosi</>
                      : <><Shuffle className="w-3 h-3" />casuali</>}
                  </span>
                  <span className="font-mono text-gray-300 dark:text-gray-600">{lobby.code}</span>
                </div>
              </div>
              <button
                onClick={() => joinLobby(lobby.code)}
                disabled={isInLobby || lobby.players.some((p) => p.userId === user?.id)}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {lobby.players.some((p) => p.userId === user?.id) ? 'Sei dentro' : isInLobby ? 'In lobby' : 'Unisciti'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
