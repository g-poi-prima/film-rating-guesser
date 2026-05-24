import { useState, useEffect } from 'react';
import { getProfile, updateProfile } from '../lib/api';
import type { UserProfile } from '../types';
import { User, Save, Mail, Key, Gamepad2, Star, Swords, Users, Trophy, TrendingUp } from 'lucide-react';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
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

  const totalGuesses = (profile?.gamesPlayed ?? 0) + (profile?.matchRoundsPlayed ?? 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          Il mio profilo
        </h1>
      </div>

      {profile && (
        <>
          {/* ── Stats grid ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={<Gamepad2 className="w-5 h-5 text-primary" />} bg="bg-primary/10" value={profile.gamesPlayed} label="Partite solo" />
            <StatCard icon={<Swords className="w-5 h-5 text-indigo-500" />} bg="bg-indigo-50 dark:bg-indigo-900/20" value={profile.matchesPlayed} label="Match 1v1" />
            <StatCard icon={<Star className="w-5 h-5 text-yellow-500" />} bg="bg-yellow-50 dark:bg-yellow-900/20" value={profile.totalScore} label="Punti totali" />
            <StatCard icon={<TrendingUp className="w-5 h-5 text-green-500" />} bg="bg-green-50 dark:bg-green-900/20" value={totalGuesses > 0 ? Math.round(profile.totalScore / totalGuesses * 10) / 10 : 0} label="Media/guess" />
          </div>

          {/* ── Match record ─────────────────────────────────────────────── */}
          {profile.matchesPlayed > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4" /> Record 1v1
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  {/* Win-loss bar */}
                  <div className="h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex">
                    {profile.matchWins > 0 && (
                      <div
                        className="bg-green-500 h-full transition-all"
                        style={{ width: `${(profile.matchWins / profile.matchesPlayed) * 100}%` }}
                      />
                    )}
                    {profile.matchDraws > 0 && (
                      <div
                        className="bg-amber-400 h-full transition-all"
                        style={{ width: `${(profile.matchDraws / profile.matchesPlayed) * 100}%` }}
                      />
                    )}
                    {profile.matchLosses > 0 && (
                      <div
                        className="bg-red-400 h-full transition-all"
                        style={{ width: `${(profile.matchLosses / profile.matchesPlayed) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" />{profile.matchWins}V</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-full" />{profile.matchDraws}P</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-full" />{profile.matchLosses}S</span>
                  </div>
                </div>
                <div className="text-center flex-shrink-0">
                  <p className="text-2xl font-black text-primary">
                    {profile.matchesPlayed > 0 ? Math.round((profile.matchWins / profile.matchesPlayed) * 100) : 0}%
                  </p>
                  <p className="text-xs text-gray-400">win rate</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">{profile.matchRoundsPlayed} round totali giocati in 1v1</p>
            </div>
          )}

          {/* ── Friends count ──────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold">{profile.friendCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Amici</p>
            </div>
            <a href="/friends" className="text-sm text-primary hover:underline font-medium">Gestisci →</a>
          </div>

          {/* ── Edit form ──────────────────────────────────────────────────── */}
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
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="field" />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Mail className="w-3.5 h-3.5" /> Email
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Key className="w-3.5 h-3.5" /> Nuova password
              </label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="field" placeholder="lascia vuoto per non cambiare" minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvataggio...' : 'Salva modifiche'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, bg, value, label }: { icon: React.ReactNode; bg: string; value: number; label: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3">
      <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}
