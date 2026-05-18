import { useState, useEffect } from 'react';
import { getAdminUsers, updateUserRole, deleteUser } from '../lib/api';
import type { AdminUser } from '../types';
import { Shield, Trash2, UserCog, Search } from 'lucide-react';

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    getAdminUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleToggle = async (user: AdminUser) => {
    setActionLoading(user.id);
    try {
      await updateUserRole(user.id, user.role === 'ADMIN' ? 'USER' : 'ADMIN');
      fetchUsers();
    } catch {
      alert("Errore nell'aggiornamento del ruolo");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Eliminare l'utente "${user.username}"?`)) return;
    setActionLoading(user.id);
    try {
      await deleteUser(user.id);
      fetchUsers();
    } catch {
      alert("Errore nell'eliminazione dell'utente");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Pannello Admin
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {users.length} utenti registrati
        </p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per username o email..."
          className="field pl-10"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Utente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Email</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Partite</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Ruolo</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium">{user.username}</td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{user.email}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{user._count.games}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'ADMIN'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                      {user.role === 'ADMIN' && <Shield className="w-3 h-3" />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleRoleToggle(user)}
                        disabled={actionLoading === user.id}
                        title={user.role === 'ADMIN' ? 'Rimuovi admin' : 'Promuovi ad admin'}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                      >
                        <UserCog className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={actionLoading === user.id}
                        title="Elimina utente"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              Nessun utente trovato
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
