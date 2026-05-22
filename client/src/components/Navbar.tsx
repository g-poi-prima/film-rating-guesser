import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { useMatch } from '../context/MatchContext';
import {
  Film,
  Sun,
  Moon,
  Trophy,
  History,
  User,
  LogOut,
  Shield,
  Menu,
  X,
  Swords,
  MessageCircle,
} from 'lucide-react';
import { useState } from 'react';

const links = [
  { to: '/', label: 'Gioca', icon: Film },
  { to: '/match', label: '1v1', icon: Swords },
  { to: '/chat', label: 'Chat', icon: MessageCircle },
  { to: '/ranking', label: 'Classifica', icon: Trophy },
  { to: '/history', label: 'Storico', icon: History },
  { to: '/profile', label: 'Profilo', icon: User },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const { onlineUsers } = useSocket();
  const { phase } = useMatch();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const onlineCount = onlineUsers.filter((u) => u.id !== user?.id).length;

  const matchActive = phase !== 'idle' && phase !== 'result' && phase !== 'disconnected';
  const showMatchBanner = matchActive && location.pathname !== '/match';

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
            <Film className="w-6 h-6" />
            <span className="hidden sm:inline">FilmRatingGuessr</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => {
              const active = location.pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <l.icon className="w-4 h-4" />
                  {l.label}
                  {l.to === '/chat' && onlineCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {onlineCount > 9 ? '9+' : onlineCount}
                    </span>
                  )}
                </Link>
              );
            })}
            {user?.role === 'ADMIN' && (
              <Link
                to="/admin"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/admin'
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={dark ? 'Tema chiaro' : 'Tema scuro'}
            >
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user && (
              <button
                onClick={logout}
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Esci
              </button>
            )}

            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Match-in-progress banner */}
      {showMatchBanner && (
        <div className="bg-primary/10 border-t border-primary/20 px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-xs font-medium text-primary">
              {phase === 'queuing' ? 'In coda...' : 'Partita in corso'}
            </span>
          </div>
          <Link
            to="/match"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Torna alla partita →
          </Link>
        </div>
      )}

      {open && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 pb-4">
          {links.map((l) => {
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <l.icon className="w-4 h-4" />
                {l.label}
                {l.to === '/chat' && onlineCount > 0 && (
                  <span className="ml-auto text-xs bg-green-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                    {onlineCount > 9 ? '9+' : onlineCount}
                  </span>
                )}
              </Link>
            );
          })}
          {user?.role === 'ADMIN' && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/admin'
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          )}
          {user && (
            <button
              onClick={() => { logout(); setOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 w-full mt-1"
            >
              <LogOut className="w-4 h-4" />
              Esci
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
