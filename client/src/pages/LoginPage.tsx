import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Film, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(username, password);
      localStorage.setItem('token', data.token);
      setUser(data.user);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Errore di login';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Film className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Bentornato</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Accedi per continuare a giocare</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="field"
              placeholder="il tuo username"
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Non hai un account?{' '}
            <Link to="/register" className="text-primary hover:text-primary-dark font-medium transition-colors">
              Registrati
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
