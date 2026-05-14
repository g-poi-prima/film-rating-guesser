import { useState, useEffect } from 'react';
import { getProfile, updateProfile } from '../lib/api';
import { User, Save, Mail, Key, Gamepad2, Star } from 'lucide-react';

export default function ProfilePage() {
  const [profile, setProfile] = useState<{ username: string; email: string; avatar?: string | null; totalScore: number; gamesPlayed: number } | null>(null);
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
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <User className="w-8 h-8 text-primary" />
          Il Mio Profilo
        </h1>
      </div>

      {profile && (
        <div className="grid gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Gamepad2 className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold">{profile.gamesPlayed}</p>
                <p className="text-sm text-gray-500">Partite</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Star className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                <p className="text-2xl font-bold">{profile.totalScore}</p>
                <p className="text-sm text-gray-500">Punti totali</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            {message && (
              <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm p-3 rounded-lg">
                {message}
              </div>
            )}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <User className="w-4 h-4" /> Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Mail className="w-4 h-4" /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <Key className="w-4 h-4" /> Nuova Password (lascia vuoto per non cambiare)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
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
