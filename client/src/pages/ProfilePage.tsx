import { useState, useEffect } from 'react';
import { getProfile, updateProfile } from '../lib/api';
import { User, Save, Mail, Key, Gamepad2, Star } from 'lucide-react';

type Profile = { username: string; email: string; avatar?: string | null; totalScore: number; gamesPlayed: number };

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getProfile()
      .then((data) => {
        setProfile(data);
        setUsername(data.username);
        setEmail(data.email);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const data: { username?: string; email?: string; password?: string } = {};
      if (username !== profile?.username) data.username = username;
      if (email !== profile?.email) data.email = email;
      if (password) data.password = password;

      if (Object.keys(data).length === 0) {
        setMessage('Nessuna modifica da salvare');
        setSaving(false);
        return;
      }

      await updateProfile(data);
      setPassword('');
      setMessage('Profilo aggiornato con successo!');
      const updated = await getProfile();
      setProfile(updated);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Errore durante il salvataggio';
      setError(msg);
    } finally {
      setSaving(false);
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
          <User className="w-6 h-6 text-primary" />
          Il mio profilo
        </h1>
      </div>

      {profile && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Gamepad2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{profile.gamesPlayed}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Partite giocate</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{profile.totalScore}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Punti totali</p>
              </div>
            </div>
          </div>

          {/* Edit form */}
          <form onSubmit={handleSave} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-700 dark:text-gray-300">Modifica dati</h2>

            {message && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/40 text-green-700 dark:text-green-400 text-sm p-3 rounded-xl">
                {message}
              </div>
            )}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                <User className="w-3.5 h-3.5" /> Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="field"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Mail className="w-3.5 h-3.5" /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Key className="w-3.5 h-3.5" /> Nuova password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
                placeholder="lascia vuoto per non cambiare"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvataggio...' : 'Salva modifiche'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
